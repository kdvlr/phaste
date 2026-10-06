# 0003. Dual Local Engine: ONNX Vision Embeddings and OCR for Image Search

We chose a dual local indexing pipeline for all image pastes: an ONNX Runtime-powered vision-language model (CLIP/SigLIP) for visual semantic similarity alongside Tesseract OCR for text extraction. This allows unified hybrid search across both visual concepts (e.g., "sunset over mountain", "server rack") and exact textual content embedded within images (e.g., error logs, serial numbers, receipts) completely self-hosted on CPU without external API dependencies.
