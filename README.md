# Streaming Multi-channel Audio to Amazon Transcribe using Web Audio API

This is a code sample for the blog post `Streaming Multi-channel Audio to Amazon Transcribe using Web Audio API`

## Setup

1. Install bun from https://bun.sh/

2. Permissions: You will need an AWS IAM policy with the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DemoWebAudioAmazonTranscribe",
      "Effect": "Allow",
      "Action": "transcribe:StartStreamTranscriptionWebSocket",
      "Resource": "*"
    }
  ]
}
```

3. Create an .env file with the following variables and fill in your AWS access key, secret key and session token. You can change the region if you need and `VITE_SESSION_TOKEN` is optional.

   ```sh
   VITE_ACCESS_KEY_ID=
   VITE_SECRET_ACCESS_KEY=
   VITE_REGION=us-east-1
   VITE_SESSION_TOKEN=
   ```

   > WARNING: Do not deploy this application with any of these environmental keys to a public site. Instead, you can use [Amazon Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html) to grant access to this policy.

4. Run `bun install`

5. Run `bun dev` and navigate to http://localhost:5173/

6. Your browser will prompt you to grant microphone access, which you'll need to allow. If no microphones are detected, try resetting the permissions in your browser settings.
