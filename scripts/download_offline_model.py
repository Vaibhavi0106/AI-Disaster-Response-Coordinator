import os
from huggingface_hub import snapshot_download, hf_hub_download

MODEL_REPO = "onnx-community/Qwen2.5-0.5B-Instruct"
LOCAL_DIR = "static/models/qwen2.5-0.5b-instruct"

def download_model():
    print(f"Downloading model configs and tokenizer for '{MODEL_REPO}'...")
    snapshot_download(
        repo_id=MODEL_REPO,
        local_dir=LOCAL_DIR,
        allow_patterns=["*.json", "*.txt"],
    )
    
    print(f"Downloading ONNX q4 quantized model weights...")
    hf_hub_download(
        repo_id=MODEL_REPO,
        filename="onnx/model_q4.onnx",
        local_dir=LOCAL_DIR,
    )
    print(f"Model downloaded successfully to {LOCAL_DIR}")

if __name__ == "__main__":
    download_model()
