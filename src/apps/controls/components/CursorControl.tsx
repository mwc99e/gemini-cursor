import React, { useEffect } from "react";
import { useLiveAPIContext } from "../contexts/LiveAPIContext";
import { Tool, SchemaType } from "@google/generative-ai";

// Types
interface MoveCursorArgs {
  x: number;
  y: number;
}

interface ResponseObject {
  id: string;
  name: string;
  response: { result: object };
}

// Tools
const toolObject: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "move_cursor",
        description:
          "Moves the cursor to the specified coordinates on the screen. The coordinates should be normalised from 0-1000.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            x: {
              type: SchemaType.NUMBER,
              description: "X coordinate to move cursor to",
            },
            y: {
              type: SchemaType.NUMBER,
              description: "Y coordinate to move cursor to",
            },
          },
          required: ["x", "y"],
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

Once you've moved the cursor, do not respond with phrases like "I've moved the cursor to the location".
Just continue with the conversation naturally.

Do not respond with phrases like "is there anything else I can do for you?" or "let me know if there's anything else you need".
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
    const handleToolCall = (toolCall: any) => {
      const functionCalls = toolCall.functionCalls;
      const functionResponses: ResponseObject[] = [];

      if (functionCalls.length > 0) {
        functionCalls.forEach((fCall: any) => {
          if (fCall.name === "move_cursor") {
            const args = fCall.args as MoveCursorArgs;
            // For now, just log the coordinates
            console.log(
              `Moving cursor to coordinates: x=${args.x}, y=${args.y}`
            );

            window.electronAPI.moveCursor(args.x, args.y);
          }

          const functionResponse = {
            id: fCall.id,
            name: fCall.name,
            response: {
              result: { string_value: "Cursor movement done." },
            },
          };

          functionResponses.push(functionResponse);
        });

        // Send tool responses back to the model
        const toolResponse = {
          functionResponses: functionResponses,
        };
        client.sendToolResponse(toolResponse);
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
