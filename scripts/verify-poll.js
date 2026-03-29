import { extractJsonObject } from "../src/ai/GroqService.js";

const sampleReply = `
Certainly! Here is an MCQ for you:
{
  "type": "poll",
  "question": "Which AWS service is used for object storage?",
  "options": ["EC2", "S3", "RDS", "Lambda"],
  "correct_option_index": 1,
  "explanation": "S3 (Simple Storage Service) is the primary object storage service in AWS."
}
Hope this helps!
`;

const pollData = extractJsonObject(sampleReply);
console.log("Extracted Poll Data:", pollData);

if (pollData && pollData.type === "poll" && pollData.question && Array.isArray(pollData.options)) {
    console.log("✅ Verification Successful: Poll data correctly extracted.");
    console.log("Question:", pollData.question);
    console.log("Options:", pollData.options);
    console.log("Correct Index:", pollData.correct_option_index);
} else {
    console.error("❌ Verification Failed: Poll data not extracted correctly.");
    process.exit(1);
}
