# openclaw-stepfun-video

Step 3.7 Flash video understanding provider for OpenClaw.

Adds native `describeVideo` support for Step 3.7 Flash — no external scripts needed.

## Install

```bash
openclaw plugins install clawhub:stepfun-video
```

## Prerequisites

1. A [StepFun API key](https://platform.stepfun.ai/interface-key)
2. StepFun provider configured in OpenClaw:

```json5
{
  "models": {
    "providers": {
      "stepfun": {
        "baseUrl": "https://api.stepfun.ai/v1",
        "apiKey": "sk-...",
        "api": "openai-completions",
        "models": [{
          "id": "step-3.7-flash",
          "name": "Step 3.7 Flash",
          "input": ["text", "image", "video"],
          "contextWindow": 256000,
          "maxTokens": 32768
        }]
      }
    }
  }
}
```

## Configuration

Add to your OpenClaw config (`tools.media.video.models`):

```json5
{
  "tools": {
    "media": {
      "video": {
        "models": [
          { "type": "provider", "provider": "stepfun", "model": "step-3.7-flash", "capabilities": ["video"] }
        ]
      }
    }
  }
}
```

## Usage

Send a video file (MP4/MOV/MKV, ≤128MB, ≤5min) in any OpenClaw chat.
The plugin generates a text description automatically.

CLI test:
```bash
openclaw infer video describe --file demo.mp4 --model stepfun/step-3.7-flash
```

## API Reference

- [Step 3.7 Flash Quickstart](https://platform.stepfun.ai/docs/en/guides/models/step-3.7-flash-quickstart)
- [Video Best Practices](https://platform.stepfun.ai/docs/en/guides/developer/video-chat)
- [Pricing](https://platform.stepfun.ai/docs/en/guides/pricing/details)

## License

MIT
