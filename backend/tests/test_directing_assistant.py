import unittest
import os

os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("PINECONE_API_KEY", "test-pinecone-key")

from services.directing_assistant import _parse_directing_plan, generate_directing_plan


class DirectingAssistantTests(unittest.TestCase):
    def test_parse_directing_plan_validates_structured_json(self):
        plan = _parse_directing_plan(
            """
            {
              "overview": "Film this as a direct-to-camera explainer.",
              "scenes": [
                {
                  "id": "Hook",
                  "scriptExcerpt": "What if your routine is backwards?",
                  "visualGoal": "Stop the scroll immediately.",
                  "location": "Desk setup",
                  "shots": ["Tight face shot", "Quick push-in"],
                  "performanceDirection": "Start calm, then sharpen the final word.",
                  "props": ["Phone", "Coffee mug"]
                }
              ],
              "bRoll": [
                {
                  "moment": "morning routine",
                  "shot": "Alarm clock beside an untouched notebook.",
                  "purpose": "Make the pain point visual."
                }
              ],
              "shootingTips": ["Use soft window light."],
              "creativeIdeas": ["Open on the alarm before the creator speaks."],
              "editingNotes": ["Cut on the strongest phrase."]
            }
            """
        )

        self.assertEqual(plan.overview, "Film this as a direct-to-camera explainer.")
        self.assertEqual(plan.scenes[0].id, "Hook")
        self.assertEqual(plan.bRoll[0].purpose, "Make the pain point visual.")

    def test_generate_directing_plan_rejects_empty_script(self):
        with self.assertRaisesRegex(ValueError, "Script is required"):
            generate_directing_plan("   ", "creator")


if __name__ == "__main__":
    unittest.main()
