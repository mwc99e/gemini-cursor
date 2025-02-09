import React, { useEffect } from "react";
import { useLiveAPIContext } from "../contexts/LiveAPIContext";
import { Tool, SchemaType } from "@google/generative-ai";

// Types
interface CursorMovement {
  x: number;
  y: number;
  delay: number;
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
          "Moves the cursor through a sequence of coordinates on the screen with specified delays between movements. The coordinates should be normalised from 0-1000.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            movements: {
              type: SchemaType.ARRAY,
              items: {
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
                  delay: {
                    type: SchemaType.NUMBER,
                    description:
                      "Delay in milliseconds before the next movement",
                  },
                },
                required: ["x", "y", "delay"],
              },
              description: "Array of cursor movements with delays",
            },
          },
          required: ["movements"],
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

Remember that you will not be asked to move your cursor. You should reason when it is appropriate to move your cursor.

Since you will respond with multiple movements and delays, assign appropriate delays so that it will
synchronise with your speech. Small delays should rarely be used.

The time it takes for you to speak 5 words is approximately 3 seconds.
Calculate the delays based on this.
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
    const handleToolCall = async (toolCall: any) => {
      const functionCalls = toolCall.functionCalls;
      const functionResponses: ResponseObject[] = [];

      if (functionCalls.length > 0) {
        for (const fCall of functionCalls) {
          if (fCall.name === "move_cursor") {
            const { movements } = fCall.args;
            console.log("movements", movements);

            // Calculate cumulative delays for sequential movements
            let cumulativeDelay = 0;
            for (const movement of movements) {
              await new Promise((resolve) => {
                setTimeout(() => {
                  window.electronAPI.moveCursor(movement.x, movement.y);
                  resolve(null);
                }, cumulativeDelay);
              });
              cumulativeDelay += movement.delay;
            }
          }

          const functionResponse = {
            id: fCall.id,
            name: fCall.name,
            response: {
              result: { string_value: "Cursor movements completed." },
            },
          };

          functionResponses.push(functionResponse);
        }

        // Send tool responses back to the model
        const toolResponse = {
          functionResponses: functionResponses,
        };
        // client.sendToolResponse(toolResponse);
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
