import torch
import numpy as np
import json
from typing import List, Dict, Tuple
from pathlib import Path
import logging
import sys
from types import SimpleNamespace

class ConfigParams:
    """Dummy Klasse zum Laden des Modells."""
    def __init__(self):
        pass

sys.modules['__main__'].ConfigParams = ConfigParams

logger = logging.getLogger(__name__)

class AKTModelService:
    """
    Service für AKT Model Predictions.
    Verwaltet Model Loading, Mappings und Inference.
    """
    
    def __init__(
        self, 
        model_path: str = "ml_models/akt_model_best.pth",
        mappings_path: str = "ml_models/akt_model_mappings.json"
    ):
        """
        Args:
            model_path: Pfad zum trainierten AKT Model (.pth Datei)
            mappings_path: Pfad zur Mappings JSON Datei
        """
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        
        # Lade Mappings
        self._load_mappings(mappings_path)
        
        # Lade Model
        self._load_model(model_path)
        
        logger.info("AKT Model Service initialized successfully")
    
    def _load_mappings(self, mappings_path: str):
        """Lädt die Skill/Problem Mappings."""
        with open(mappings_path, 'r', encoding='utf-8') as f:
            self.mappings = json.load(f)
        
        self.skill_to_idx = self.mappings["skill_to_idx"]
        self.problem_to_idx = self.mappings["problem_to_idx"]
        self.idx_to_skill = {int(k): v for k, v in self.mappings["idx_to_skill"].items()}
        self.idx_to_problem = {int(k): v for k, v in self.mappings["idx_to_problem"].items()}
        
        logger.info(f"Loaded mappings: {len(self.skill_to_idx)} skills, {len(self.problem_to_idx)} problems")
    
    def _load_model(self, model_path: str):
        """Lädt das trainierte AKT Modell."""
        if not Path(model_path).exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        # Custom unpickler für ConfigParams handling
        import pickle
        import io
        
        class CustomUnpickler(pickle.Unpickler):
            def find_class(self, module, name):
                if name == 'ConfigParams':
                    return ConfigParams
                return super().find_class(module, name)
        
        # Lade Checkpoint mit error handling
        try:
            # First try normal loading
            checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
        except AttributeError as e:
            if 'ConfigParams' in str(e):
                logger.warning("ConfigParams issue detected, using workaround...")
                # Load with custom unpickler
                with open(model_path, 'rb') as f:
                    checkpoint = torch.load(f, map_location=self.device, 
                                          pickle_module=pickle, 
                                          weights_only=False)
            else:
                raise
        
        self.model_params = checkpoint['params']
        
        # Falls params ein dict ist, konvertiere zu SimpleNamespace
        if isinstance(self.model_params, dict):
            self.model_params = SimpleNamespace(**self.model_params)
        
        # Ensure all required attributes exist
        required_attrs = ['n_question', 'n_pid', 'n_block', 'd_model', 'dropout', 
                         'kq_same', 'l2', 'final_fc_dim', 'n_head', 'd_ff', 'seqlen']
        
        for attr in required_attrs:
            if not hasattr(self.model_params, attr):
                logger.warning(f"Missing attribute {attr}, using default value")
                # Set defaults
                defaults = {
                    'n_question': 102,
                    'n_pid': 3162,
                    'n_block': 1,
                    'd_model': 256,
                    'dropout': 0.1,
                    'kq_same': True,
                    'l2': 1e-5,
                    'final_fc_dim': 512,
                    'n_head': 8,
                    'd_ff': 1024,
                    'seqlen': 200,
                    'separate_qa': False
                }
                setattr(self.model_params, attr, defaults.get(attr, None))
        
        # Initialisiere Model
        from models.akt import AKT
        
        self.model = AKT(
            n_question=self.model_params.n_question,
            n_pid=self.model_params.n_pid,
            n_blocks=self.model_params.n_block,
            d_model=self.model_params.d_model,
            dropout=self.model_params.dropout,
            kq_same=self.model_params.kq_same,
            model_type='akt',
            l2=self.model_params.l2,
            final_fc_dim=self.model_params.final_fc_dim,
            n_heads=self.model_params.n_head,
            d_ff=self.model_params.d_ff,
            separate_qa=getattr(self.model_params, 'separate_qa', False)
        ).to(self.device)
        
        # Lade Model Weights
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.eval()  # Wichtig: Eval Mode für Inference
        
        logger.info(f"Model loaded from {model_path}")
        logger.info(f"Model expects: {self.model_params.n_question} skills, {self.model_params.n_pid} problems")
    
    def predict_next_correct_probability(
        self, 
        interaction_history: List[Dict[str, any]], 
        next_problem_id: str,
        next_skill_id: str
    ) -> float:
        """
        Vorhersage der Wahrscheinlichkeit, dass die nächste Antwort korrekt ist.
        
        Args:
            interaction_history: Liste von Interaktionen 
                [{"problem_id": "123", "skill_id": "addition", "correct": 1}, ...]
            next_problem_id: Problem ID der nächsten Frage
            next_skill_id: Skill ID der nächsten Frage
            
        Returns:
            Wahrscheinlichkeit (0-1) für korrekte Antwort
        """
        
        # Konvertiere History zu Model Input
        q_seq, qa_seq, pid_seq = self._prepare_sequences(
            interaction_history, 
            next_problem_id, 
            next_skill_id
        )
        
        # Model Inference
        with torch.no_grad():
            output = self._run_inference(q_seq, qa_seq, pid_seq)
        
        # Extrahiere Wahrscheinlichkeit für die letzte Position
        # Finde die letzte nicht-gepaddte Position
        non_zero_mask = (q_seq[0] != 0)
        
        if non_zero_mask.any():
            # nonzero() gibt ein Tuple zurück für numpy arrays
            non_zero_indices = non_zero_mask.nonzero()
            # Extrahiere das erste (und einzige) Element des Tuples
            if isinstance(non_zero_indices, tuple):
                indices_array = non_zero_indices[0]
            else:
                indices_array = non_zero_indices
            
            # Nimm den letzten Index
            last_valid_idx = int(indices_array[-1])
        else:
            last_valid_idx = 0
        
        # Stelle sicher, dass output 1D ist
        if len(output.shape) > 1:
            output = output.squeeze()
        
        # Hole den Wert sicher
        if last_valid_idx < len(output):
            next_prob = output[last_valid_idx]
            # Konvertiere zu Python float
            if hasattr(next_prob, 'item'):
                next_prob = next_prob.item()
            else:
                next_prob = float(next_prob)
        else:
            logger.warning(f"Index {last_valid_idx} out of bounds for output length {len(output)}")
            next_prob = 0.5  # Default
        
        return float(np.clip(next_prob, 0.0, 1.0))
    
    def get_skill_mastery(
        self,
        interaction_history: List[Dict[str, any]],
        target_skill_id: str
    ) -> Dict[str, float]:
        """
        Berechnet Mastery Score für einen spezifischen Skill.
        
        Returns:
            Dict mit mastery_score, confidence und details
        """
        
        # Filtere Interaktionen für den Ziel-Skill
        skill_interactions = [
            i for i in interaction_history 
            if i["skill_id"] == target_skill_id
        ]
        
        if not skill_interactions:
            return {
                "mastery_score": 0.5,
                "confidence": "low",
                "n_attempts": 0,
                "prediction_based": False
            }
        
        # Berechne einfache Statistiken
        correct_count = sum(1 for i in skill_interactions if i["correct"])
        total_count = len(skill_interactions)
        simple_accuracy = correct_count / total_count if total_count > 0 else 0.5
        
        # Wenn genug Daten vorhanden, nutze AKT Predictions
        if len(interaction_history) >= 5:
            # Finde ein typisches Problem für diesen Skill
            skill_problems = [i["problem_id"] for i in skill_interactions]
            if skill_problems:
                # Verwende das häufigste Problem
                from collections import Counter
                most_common_problem = Counter(skill_problems).most_common(1)[0][0]
                
                # Vorhersage für dieses Problem
                try:
                    predicted_prob = self.predict_next_correct_probability(
                        interaction_history,
                        next_problem_id=most_common_problem,
                        next_skill_id=target_skill_id
                    )
                    
                    # Kombiniere historische Accuracy mit Prediction
                    mastery_score = 0.7 * predicted_prob + 0.3 * simple_accuracy
                    
                    return {
                        "mastery_score": round(mastery_score, 3),
                        "confidence": self._get_confidence_level(total_count),
                        "n_attempts": total_count,
                        "n_correct": correct_count,
                        "historical_accuracy": round(simple_accuracy, 3),
                        "predicted_probability": round(predicted_prob, 3),
                        "prediction_based": True
                    }
                except Exception as e:
                    logger.warning(f"Prediction failed for skill {target_skill_id}: {e}")
        
        # Fallback auf einfache Statistiken
        return {
            "mastery_score": round(simple_accuracy, 3),
            "confidence": self._get_confidence_level(total_count),
            "n_attempts": total_count,
            "n_correct": correct_count,
            "historical_accuracy": round(simple_accuracy, 3),
            "prediction_based": False
        }
    
    def get_problem_difficulty_for_student(
        self,
        interaction_history: List[Dict[str, any]],
        problem_id: str,
        skill_id: str
    ) -> Dict[str, any]:
        """
        Schätzt die Schwierigkeit eines Problems für einen spezifischen Schüler.
        """
        if not interaction_history:
            return {
                "difficulty": "unknown",
                "predicted_success": 0.5,
                "confidence": "no_data"
            }
        
        # Vorhersage
        success_prob = self.predict_next_correct_probability(
            interaction_history,
            next_problem_id=problem_id,
            next_skill_id=skill_id
        )
        
        # Kategorisierung
        if success_prob >= 0.8:
            difficulty = "sehr_einfach"
        elif success_prob >= 0.65:
            difficulty = "einfach"
        elif success_prob >= 0.5:
            difficulty = "mittel"
        elif success_prob >= 0.35:
            difficulty = "schwer"
        else:
            difficulty = "sehr_schwer"
        
        return {
            "difficulty": difficulty,
            "predicted_success": round(success_prob, 3),
            "confidence": "model_based"
        }
    
    def _prepare_sequences(
        self, 
        interaction_history: List[Dict],
        next_problem_id: str,
        next_skill_id: str
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Konvertiert Interaction History zu Model Input Sequences.
        """
        
        # Listen für die Sequenzen
        q_list = []  # Skill indices
        qa_list = []  # Skill + correct * n_skills  
        pid_list = []  # Problem indices
        
        # Verarbeite History
        for interaction in interaction_history:
            skill_idx = self.skill_to_idx.get(interaction["skill_id"])
            problem_idx = self.problem_to_idx.get(str(interaction["problem_id"]))
            
            if skill_idx is None or problem_idx is None:
                logger.warning(f"Skipping unknown skill/problem: {interaction}")
                continue
            
            q_list.append(skill_idx)
            # qa encoding: skill_idx + correct * n_skills
            qa_idx = skill_idx + interaction["correct"] * self.model_params.n_question
            qa_list.append(qa_idx)
            pid_list.append(problem_idx)
        
        # Füge nächste Frage hinzu
        next_skill_idx = self.skill_to_idx.get(next_skill_id)
        next_problem_idx = self.problem_to_idx.get(str(next_problem_id))
        
        if next_skill_idx is not None and next_problem_idx is not None:
            q_list.append(next_skill_idx)
            qa_list.append(next_skill_idx)  # Ohne Antwort (als ob correct=0)
            pid_list.append(next_problem_idx)
        else:
            logger.warning(f"Next skill/problem not found: skill={next_skill_id}, problem={next_problem_id}")
            # Wenn die nächste Frage nicht gefunden wird, verwende Dummy-Werte
            if not q_list:  # Wenn auch keine History, füge mindestens einen Eintrag hinzu
                q_list.append(1)
                qa_list.append(1)
                pid_list.append(1)
        
        # Handle sequence length
        seqlen = self.model_params.seqlen
        
        if len(q_list) > seqlen:
            # Nimm die letzten seqlen Interaktionen
            q_list = q_list[-seqlen:]
            qa_list = qa_list[-seqlen:]
            pid_list = pid_list[-seqlen:]
        elif len(q_list) < seqlen:
            # Padding vorne (nicht hinten!)
            pad_len = seqlen - len(q_list)
            q_list = [0] * pad_len + q_list
            qa_list = [0] * pad_len + qa_list
            pid_list = [0] * pad_len + pid_list
        
        # Konvertiere zu numpy arrays
        q_seq = np.array([q_list], dtype=np.int64)
        qa_seq = np.array([qa_list], dtype=np.int64)
        pid_seq = np.array([pid_list], dtype=np.int64)
        
        return q_seq, qa_seq, pid_seq
    
    def _run_inference(self, q_seq, qa_seq, pid_seq) -> torch.Tensor:
        """Führt Model Inference aus."""
        
        # Konvertiere zu Tensors
        q_tensor = torch.from_numpy(q_seq).long().to(self.device)
        qa_tensor = torch.from_numpy(qa_seq).long().to(self.device)
        pid_tensor = torch.from_numpy(pid_seq).long().to(self.device)
        
        # Target tensor (wird nicht wirklich für Inference gebraucht)
        target_tensor = torch.ones_like(q_tensor, dtype=torch.float)
        
        # Model Forward Pass
        _, predictions, _ = self.model(q_tensor, qa_tensor, target_tensor, pid_tensor)
        
        # predictions shape: (batch_size * seqlen,)
        # Reshape zu (seqlen,) da batch_size=1
        predictions = predictions.view(-1)
        
        return predictions
    
    def _get_confidence_level(self, n_attempts: int) -> str:
        """Bestimmt Confidence Level basierend auf Anzahl Versuche."""
        if n_attempts >= 10:
            return "high"
        elif n_attempts >= 5:
            return "medium"
        else:
            return "low"

# Singleton Instance
_akt_service_instance = None

def get_akt_service() -> AKTModelService:
    """
    Factory Function für AKT Service (Singleton Pattern).
    """
    global _akt_service_instance
    
    if _akt_service_instance is None:
        from config import settings
        _akt_service_instance = AKTModelService(
            model_path=settings.akt_model_path,
            mappings_path=settings.akt_mappings_path
        )
    
    return _akt_service_instance
