## YOLOv8 Training Exploration (100 Epochs)

This directory houses Jupyter Notebooks documenting experiments to train YOLOv8 models for optimal object detection. Each notebook explores a different YOLOv8 variant size ("n" to "l") trained for 100 epochs.

**Objective:**

- Investigate the trade-off between model complexity (potentially higher accuracy) and computational efficiency (faster inference).

**Methodology:**

- Trained YOLOv8 models in various sizes ("n", "s", "m", "l") to assess complexity vs. accuracy.
- Standardized training duration to 100 epochs for consistent evaluation.
- Monitored training with epoch vs. loss/metric curves to analyze:
    - Convergence (effective learning)
    - Overfitting (memorizing training data)
    - Hyperparameter impact on training dynamics
- Iteratively adjusted training parameters (learning rate, optimizers) based on curve analysis to achieve well-balanced models (accuracy & efficiency).

This directory facilitates exploration of YOLOv8 size variations and understanding of factors influencing model performance.
