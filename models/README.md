# Whisper.cpp Model Setup

This directory contains the whisper.cpp models needed for local speech recognition.

## Required Files

You need to download the whisper.cpp model and place it in this directory:

- `ggml-base.en.bin` - The base English model (recommended for best balance of speed and accuracy)

## Download Instructions

### Option 1: Download Pre-compiled Model

```bash
# Download the base English model (recommended)
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" -o models/ggml-base.en.bin
```

### Option 2: Build whisper.cpp from Source

If you want to build whisper.cpp yourself:

```bash
# Clone whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Build the project
make

# Download and convert models
./models/download-ggml-model.sh base.en

# Copy the model to your project
cp models/ggml-base.en.bin /path/to/your/project/models/

# Copy the main executable
cp main /path/to/your/project/
```

## Model Options

| Model | Size | Speed | Quality |
|-------|------|--------|---------|
| `ggml-tiny.en.bin` | ~39MB | Fastest | Basic |
| `ggml-base.en.bin` | ~148MB | Fast | Good (recommended) |
| `ggml-small.en.bin` | ~466MB | Medium | Better |
| `ggml-medium.en.bin` | ~1.5GB | Slower | Excellent |
| `ggml-large-v1.bin` | ~3.0GB | Slowest | Best |

## Whisper.cpp Executable

The app will look for the whisper.cpp executable in these locations:
1. `whisper.cpp/main` (if you cloned the repo)
2. `main` (in project root)
3. `./main` (current directory)
4. System PATH (`whisper` or `whisper.cpp`)

## Troubleshooting

### Model Not Found Error
Make sure `ggml-base.en.bin` is placed directly in the `models/` directory.

### Executable Not Found Error  
Either:
1. Copy the `main` executable from whisper.cpp to your project root, or
2. Add whisper.cpp to your system PATH

### Recording Issues
Make sure you have:
- Microphone permissions granted to the Electron app
- A working microphone connected to your system
- The `mic` npm package installed (`npm install mic`)

## Performance Tips

- Use `ggml-base.en.bin` for the best balance of speed and accuracy
- For faster processing on slower machines, use `ggml-tiny.en.bin`  
- For maximum accuracy, use `ggml-large-v1.bin` (but it's much slower) 