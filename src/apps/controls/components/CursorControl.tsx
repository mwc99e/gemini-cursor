import React, { useEffect } from "react";
import { useLiveAPIContext } from "../contexts/LiveAPIContext";
import { Tool, SchemaType } from "@google/generative-ai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Tools
const toolObject: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "point_to",
        description:
          "Points to a location on the screen based on a natural language description of what to point to.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            description: {
              type: SchemaType.STRING,
              description:
                "Detailed description of what to point to on the screen, like 'the login button in the top right' or 'the settings icon that looks like a gear'",
            },
          },
          required: ["description"],
        },
      },
    ],
  },
];

const systemInstructionObject = {
  parts: [
    {
      text: `
You are a helpful assistant that can move your own cursor to appropriate locations on the screen.

Your cursor is different from the default cursor.

You will respond in speech naturally but you will also move your cursor in a natural manner.
When moving the cursor, you should also describe what you're pointing to.

Once you've moved the cursor, do not respond with phrases like "I've moved the cursor to the location".
Just continue with the conversation naturally.

Do not respond with phrases like "is there anything else I can do for you?" or "let me know if there's anything else you need".

Remember that you will not be asked to move your cursor. You should reason when it is appropriate to move your cursor.

Always speak even when calling a tool.
`,
    },
  ],
};

type CursorControlProps = {
  lastCapturedFrame: string | null;
};

async function getPointsFromImage(
  base64Image: string,
  targetDescription: string
) {
  // @ts-expect-error import.meta.env is injected by Vite
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.0-flash-exp",
  });

  const prompt = `Find the location of: "${targetDescription}". The answer should follow the json format: {"point": <point>, "label": <label1>}. The point should be in [y, x] format normalized to 0-1000. Return only one point that best matches the description. Do not wrap the JSON in markdown quotes. Just return the JSON string.`;

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

      if (functionCalls.length > 0) {
        for (const fCall of functionCalls) {
          if (fCall.name === "point_to") {
            const { description } = fCall.args;
            console.log("pointing to:", description);

            if (lastCapturedFrame) {
              const points = await getPointsFromImage(
                lastCapturedFrame,
                description
              );
              console.log("points", points);
              console.log("is array", Array.isArray(points));
              console.log("type of points", typeof points);
              let point = null;
              if (Array.isArray(points)) {
                point = points[0];
              } else {
                point = points.point;
              }

              // Use the first point from the response
              if (point) {
                const [y, x] = point;
                window.electronAPI.moveCursor(x, y);
              }
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
