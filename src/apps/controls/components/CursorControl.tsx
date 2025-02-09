import React, { useEffect } from "react";
import { useLiveAPIContext } from "../contexts/LiveAPIContext";
import { Tool, SchemaType } from "@google/generative-ai";

// Tools
const toolObject: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "point_to",
        description:
          "Points to a location on the screen using a bounding box. The coordinates should be normalised from 0-1000.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ymin: {
              type: SchemaType.NUMBER,
              description: "Minimum Y coordinate (top) normalised from 0-1000",
            },
            xmin: {
              type: SchemaType.NUMBER,
              description: "Minimum X coordinate (left) normalised from 0-1000",
            },
            ymax: {
              type: SchemaType.NUMBER,
              description:
                "Maximum Y coordinate (bottom) normalised from 0-1000",
            },
            xmax: {
              type: SchemaType.NUMBER,
              description:
                "Maximum X coordinate (right) normalised from 0-1000",
            },
          },
          required: ["ymin", "xmin", "ymax", "xmax"],
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
Always call any relevant tools *before* speaking.

Your cursor is different from the default cursor.

You will respond in speech naturally but you will also move your cursor in a natural manner.

Once you've moved the cursor, do not respond with phrases like "I've moved the cursor to the location".
Just continue with the conversation naturally.

Do not respond with phrases like "is there anything else I can do for you?" or "let me know if there's anything else you need".

Remember that you will not be asked to move your cursor. You should reason when it is appropriate to move your cursor.

Always call any relevant tools *before* speaking.
`,
    },
  ],
};

const CursorControl: React.FC = () => {
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
            const { xmin, ymin } = fCall.args;
            console.log("bbox coordinates:", fCall.args);

            window.electronAPI.moveCursor(xmin, ymin);
          }
        }
      }
    };

    client.on("toolcall", handleToolCall);
    return () => {
      client.off("toolcall", handleToolCall);
    };
  }, [client]);

  return <></>;
};

export default CursorControl;
