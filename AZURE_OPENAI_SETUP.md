# Azure OpenAI Setup Guide

## Environment Variables Configuration

Based on your Azure OpenAI SDK configuration, add the following to your `.env.local` file:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_subscription_key_here
AZURE_OPENAI_ENDPOINT=https://ai-29tiffanyg7516ai360826977620.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_DEPLOYMENT=your-deployment-name

# Google Maps API Key (keep this as is)
GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## Important Configuration Details

### 1. **AZURE_OPENAI_API_KEY**
- This is your Azure subscription key
- Get it from your Azure Portal > Azure OpenAI resource > Keys and Endpoint
- Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 2. **AZURE_OPENAI_ENDPOINT**
- Your Azure OpenAI resource endpoint URL
- You already have: `https://ai-29tiffanyg7516ai360826977620.openai.azure.com/`
- Make sure it ends with a `/`

### 3. **AZURE_OPENAI_API_VERSION**
- API version you want to use
- You already have: `2024-12-01-preview`
- This is the latest stable version

### 4. **AZURE_OPENAI_DEPLOYMENT**
- **IMPORTANT**: This is your deployment name, NOT the model name
- In Azure, you create a deployment with a custom name (e.g., "my-gpt5-chat")
- To find your deployment name:
  1. Go to Azure Portal
  2. Open your Azure OpenAI resource
  3. Go to "Model deployments" or "Deployments"
  4. Copy the **Deployment name** (not the model name)
- Example deployment names: `gpt-5-chat-deployment`, `my-gpt5-chat`, `production-gpt5`

## How to Get Your Deployment Name

### Option 1: Azure Portal
1. Log in to https://portal.azure.com/
2. Navigate to your Azure OpenAI resource
3. Click "Model deployments" in the left menu
4. You'll see a list of deployments with their names - use that name

### Option 2: Azure OpenAI Studio
1. Go to https://oai.azure.com/
2. Select your resource
3. Go to "Deployments" tab
4. Copy the deployment name from the list

## Example .env.local File

```bash
# Azure OpenAI Settings
AZURE_OPENAI_API_KEY=abc123def456ghi789jkl012mno345pq
AZURE_OPENAI_ENDPOINT=https://ai-29tiffanyg7516ai360826977620.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_DEPLOYMENT=gpt-5-chat-prod

# Google Maps
GOOGLE_MAPS_API_KEY=AIzaSyD0Ch...your_key_here
VITE_GOOGLE_MAPS_API_KEY=AIzaSyD0Ch...your_key_here
```

## Testing Your Configuration

After setting up your environment variables:

1. **Restart your server** (the app needs to reload environment variables)
   ```bash
   # Stop the server (Ctrl+C) then restart
   npm run dev
   ```

2. **Check the logs** when making a request - you should see:
   ```
   [OpenAI] Using Azure OpenAI endpoint
   ```

3. **Test with a simple query**: "to Boston"
   - If successful, you'll see AI-generated responses
   - If it fails, check the console for error messages

## Troubleshooting

### Error: "Incorrect API key provided"
- ✅ Check that `AZURE_OPENAI_API_KEY` is correct
- ✅ Verify the key is from the correct Azure resource

### Error: "Deployment not found"
- ✅ Verify `AZURE_OPENAI_DEPLOYMENT` matches your actual deployment name
- ✅ Make sure the deployment is active in Azure Portal

### Error: "Resource not found"
- ✅ Check `AZURE_OPENAI_ENDPOINT` is correct
- ✅ Ensure the endpoint URL ends with `/`

### Still Using Standard OpenAI?
If the system is still trying to use standard OpenAI:
- ✅ Make sure `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY` are both set
- ✅ Restart your development server
- ✅ Clear any cached environment variables

## What Changed in the Code

The system now:
1. **Detects Azure configuration** automatically
2. **Uses Azure OpenAI client** when Azure variables are present
3. **Falls back to standard OpenAI** if Azure variables aren't set
4. **Uses deployment names** instead of model names for Azure
5. **Logs which provider** it's using for debugging

You can still use standard OpenAI by simply not setting the Azure variables and using `OPENAI_API_KEY` instead.

