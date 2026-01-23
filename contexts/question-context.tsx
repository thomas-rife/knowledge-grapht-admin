"use client";

import { createContext, useContext, useState } from "react";
import {
  createNewQuestion,
  updateQuestion,
} from "@/app/classes/[className]/lessons/[lessonName]/actions";
import { Question } from "@/types/content.types";
import { PostgrestError } from "@supabase/supabase-js";

interface QuestionContextType {
  questionID: number | null;
  setQuestionID: React.Dispatch<React.SetStateAction<number | null>>;
  questionType: string;
  setQuestionType: React.Dispatch<React.SetStateAction<string>>;
  questionPrompt: string;
  setQuestionPrompt: React.Dispatch<React.SetStateAction<string>>;
  questionSnippet: string;
  setQuestionSnippet: React.Dispatch<React.SetStateAction<string>>;
  questionOptions: any[];
  setQuestionOptions: React.Dispatch<React.SetStateAction<any[]>>;
  correctAnswer: string;
  setCorrectAnswer: React.Dispatch<React.SetStateAction<string>>;
  topicsCovered: string[];
  setTopicsCovered: React.Dispatch<React.SetStateAction<string[]>>;
  imageUrl: string;
  setImageUrl: React.Dispatch<React.SetStateAction<string>>;
  submitQuestion: ({
    lessonName,
    questionID,
    image_url,
  }: {
    className: string;
    lessonName?: string;
    questionID?: number;
    image_url?: string | null;
  }) => Promise<{ success: boolean; error?: string | PostgrestError }>;
  resetStates: () => void;
}

const initialContext: QuestionContextType = {
  questionID: null,
  setQuestionID: () => {},
  questionType: "",
  setQuestionType: () => {},
  questionPrompt: "",
  setQuestionPrompt: () => {},
  questionSnippet: "",
  setQuestionSnippet: () => {},
  questionOptions: [],
  setQuestionOptions: () => [],
  correctAnswer: "",
  setCorrectAnswer: () => {},
  topicsCovered: [],
  setTopicsCovered: () => {},
  imageUrl: "",
  setImageUrl: () => {},
  submitQuestion: async () => ({ success: false, error: "Not implemented" }),
  resetStates: () => {},
};

const QuestionContext = createContext<QuestionContextType>(initialContext);

export const useQuestionContext = () => useContext(QuestionContext);

export const QuestionContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [questionID, setQuestionID] = useState<number | null>(null);
  const [questionType, setQuestionType] = useState("");
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [questionSnippet, setQuestionSnippet] = useState("");
  const [questionOptions, setQuestionOptions] = useState<any>([]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [topicsCovered, setTopicsCovered] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");

  const resetStates = () => {
    setQuestionID(null);
    setQuestionType("");
    setQuestionPrompt("");
    setQuestionSnippet("");
    setQuestionOptions([]);
    setCorrectAnswer("");
    setTopicsCovered([]);
    setImageUrl("");
  };

  const submitQuestion = async ({
    className,
    lessonName,
    questionID,
    image_url,
  }: {
    className: string;
    lessonName?: string;
    questionID?: number;
    image_url?: string | null;
  }) => {
    const finalImageUrl = (() => {
      const candidate = typeof image_url === "string" ? image_url : imageUrl;
      return typeof candidate === "string" && candidate.trim()
        ? candidate.trim()
        : null;
    })();

    console.log("=== submitQuestion DEBUG ===");
    console.log("questionID:", questionID);
    console.log("questionType:", questionType);
    console.log("questionPrompt:", questionPrompt);
    console.log("questionSnippet:", questionSnippet);
    console.log("topicsCovered:", topicsCovered);
    console.log("questionOptions (raw):", questionOptions);
    console.log("correctAnswer:", correctAnswer);
    console.log("finalImageUrl:", finalImageUrl);

    // UPDATE existing question
    if (questionID) {
      console.log(
        "UPDATE PATH - calling updateQuestion with questionID:",
        questionID,
      );

      const result = await updateQuestion(questionID, {
        questionType: questionType,
        prompt: questionPrompt,
        snippet: questionSnippet,
        topics: topicsCovered,
        answerOptions: questionOptions, // Send raw - let updateQuestion handle it
        answer: correctAnswer,
        image_url: finalImageUrl,
      } as any);

      console.log("updateQuestion result:", result);
      return result;
    }

    // CREATE new question
    console.log("CREATE PATH - calling createNewQuestion");

    // For creation, format options as objects
    const formattedForCreation = questionOptions.map((opt, i) => {
      if (typeof opt === "object" && opt !== null) {
        return opt;
      }
      return { [`option${i + 1}`]: String(opt) };
    });

    console.log("formattedForCreation:", formattedForCreation);

    const result = await createNewQuestion(lessonName!, className, {
      questionType,
      prompt: questionPrompt,
      snippet: questionSnippet,
      topics: topicsCovered,
      answerOptions: formattedForCreation,
      answer: correctAnswer,
      image_url: finalImageUrl,
    } as any);

    console.log("createNewQuestion result:", result);
    return result;
  };

  return (
    <QuestionContext.Provider
      value={{
        questionID,
        setQuestionID,
        questionType,
        setQuestionType,
        questionPrompt,
        setQuestionPrompt,
        questionSnippet,
        setQuestionSnippet,
        questionOptions,
        setQuestionOptions,
        correctAnswer,
        setCorrectAnswer,
        topicsCovered,
        setTopicsCovered,
        imageUrl,
        setImageUrl,
        submitQuestion,
        resetStates,
      }}
    >
      {children}
    </QuestionContext.Provider>
  );
};
