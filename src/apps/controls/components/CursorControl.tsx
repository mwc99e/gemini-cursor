import React, { useEffect } from "react";
import { useLiveAPIContext } from "../contexts/LiveAPIContext";
import { Tool, SchemaType } from "@google/generative-ai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Tools
const toolObject: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "move_cursor_sequence",
        description:
          "Moves the cursor through a sequence of points on the screen with specified delays between movements.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            points: {
              type: SchemaType.ARRAY,
              description: "List of points to move to with their delays",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  description: {
                    type: SchemaType.STRING,
                    description:
                      "Detailed description of what to point to on the screen, like 'the login button in the top right' or 'the settings icon that looks like a gear'",
                  },
                  delay: {
                    type: SchemaType.NUMBER,
                    description:
                      "Time to wait in seconds AFTER the previous point before moving to this point. For the first point, use 0 to move immediately.",
                  },
                },
                required: ["description", "delay"],
              },
            },
          },
          required: ["points"],
        },
      },
    ],
  },
];

const systemInstructionObject = {
  parts: [
    {
      text: `
You are a helpful assistant that can move your cursor to different locations on the screen in a choreographed sequence.

Your cursor is visually distinct from the default system cursor.

You will respond in speech naturally while moving your cursor in an intuitive sequence through relevant points on the screen.
When moving through points, you should describe what you're pointing to in a natural conversational way.

Timing Guidelines:
- Calculate delays based on the natural speech between points
- Use approximately 1 second for every 3 words you plan to speak
- Minimum delay between points should be 2 seconds
- Maximum delay between points should be 8 seconds
- First point should always have 0 delay (immediate)

Example speech:
"Let me show you the main features. Here in the top-left is the menu button, and if we move over here you'll see the settings panel, and finally this is where your profile information appears."

Timing breakdown for the example:
1. "Here in the top-left is the menu button" (8 words ≈ 3s)
2. "and if we move over here you'll see the settings panel" (12 words ≈ 4s)
3. "and finally this is where your profile information appears" (10 words ≈ 3s)

This would translate to delays of [0, 3, 4, 3] seconds between points.

Do not use mechanical phrases like:
- "I've moved the cursor to X"
- "Now I'm pointing at Y"
- "The cursor is now at Z"
- "Is there anything else I can help you with?"
- "Let me know if you need anything else"

Remember that you should proactively move your cursor when it helps explain or demonstrate something, without being explicitly asked to do so.

Always maintain natural conversation even when executing cursor movements. Keep the timing natural and match it to your speech rhythm.
`,
    },
  ],
};

type CursorControlProps = {
  lastCapturedFrame: string | null;
};

async function getPointsFromImage(
  base64Image: string,
  points: { description: string; delay: number }[]
) {
  const apiKey = localStorage.getItem("geminiApiKey");
  if (!apiKey) {
    throw new Error("API key not found in localStorage");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.0-flash-exp",
  });

  const results = await Promise.all(
    points.map(async ({ description }) => {
      const prompt = `Find the location of: "${description}". The answer should follow the json format: {"point": <point>, "label": <label1>}. The point should be in [y, x] format normalized to 0-1000. Return only one point that best matches the description. Do not wrap the JSON in markdown quotes. Just return the JSON string.`;

      // Remove the data URL prefix if it exists
      const imageData = base64Image.includes("data:image")
        ? base64Image.slice(base64Image.indexOf(",") + 1)
        : base64Image;

      const result = await model.generateContent([
        {
          inlineData: {
            data: imageData,
            mimeType: "image/jpeg",
          },
        },
        prompt,
      ]);

      const text = result.response.text();
      console.log("text", text);
      return JSON.parse(text);
    })
  );

  return results;
}

const CursorControl: React.FC<CursorControlProps> = ({ lastCapturedFrame }) => {
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.5,
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
        },
      },
      systemInstruction: systemInstructionObject,
      tools: toolObject,
    });
  }, [setConfig]);

  useEffect(() => {
    const handleToolCall = async (toolCall: any) => {
      const functionCalls = toolCall.functionCalls;
      console.log("functionCalls", functionCalls);

      if (
        functionCalls.length > 0 &&
        functionCalls[0].name === "move_cursor_sequence"
      ) {
        const { points } = functionCalls[0].args;

        if (points.length > 0 && lastCapturedFrame) {
          const locations = await getPointsFromImage(lastCapturedFrame, points);
          console.log("locations", locations);

          // Calculate cumulative delays (convert from seconds to milliseconds)
          let cumulativeDelay = 0;
          for (let i = 0; i < locations.length; i++) {
            const point = Array.isArray(locations[i])
              ? locations[i][0]
              : locations[i].point;
            console.log("point", point);

            // Current point's delay is added to cumulative
            cumulativeDelay += points[i].delay * 1000; // Convert to milliseconds

            if (point) {
              const [y, x] = point;
              // Schedule the cursor movement at the cumulative delay
              setTimeout(() => {
                window.electronAPI.moveCursor(x, y);
              }, cumulativeDelay);
            }
          }
        }
      }
    };

    client.on("toolcall", handleToolCall);
    return () => {
      client.off("toolcall", handleToolCall);
    };
  }, [client, lastCapturedFrame]);

  return <></>;
};

export default CursorControl;
