"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuestionContext } from "@/contexts/question-context";
import { getQuestionTopicOptions } from "@/app/classes/[className]/lessons/actions";
import QuestionEditor, {
  createDefaultAnswerOptions,
} from "@/components/questions/question-editor";
import { GraphTopic } from "@/types/content.types";

const normalizeOptions = (options: unknown[]): string[] =>
  options.map((option) => {
    if (typeof option === "string") return option;
    if (option && typeof option === "object") {
      return String(Object.values(option)[0] ?? "");
    }
    return "";
  });

const toOptionObjects = (options: string[]) =>
  options.map((option, index) => ({ [`option${index + 1}`]: option }));

const MultipleChoiceQuestion = ({ disabled = false }: { disabled?: boolean }) => {
  const [questionTopics, setQuestionTopics] = useState<GraphTopic[]>([]);
  const [lessonTopicNodeIds, setLessonTopicNodeIds] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const {
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
  } = useQuestionContext();
  const params = useParams() as { className?: string; lessonName?: string };

  useEffect(() => {
    if (questionOptions.length === 0) {
      setQuestionOptions(toOptionObjects(createDefaultAnswerOptions()));
    }
  }, [questionOptions.length, setQuestionOptions]);

  useEffect(() => {
    const fetchLessonTopics = async () => {
      setTopicsLoading(true);
      try {
        const classParam = params?.className;
        const cleanedClassName = classParam
          ? decodeURIComponent(classParam).replace(/-/g, " ").trim()
          : "";
        const response = await getQuestionTopicOptions(
          cleanedClassName,
          params?.lessonName ?? "",
        );
        setQuestionTopics(response.success ? response.topics ?? [] : []);
        setLessonTopicNodeIds(
          response.success ? response.lessonTopicNodeIds ?? [] : [],
        );
      } catch (error) {
        console.error("Unable to load question topics:", error);
        setQuestionTopics([]);
      } finally {
        setTopicsLoading(false);
      }
    };

    fetchLessonTopics();
  }, [params?.className, params?.lessonName]);

  const normalizedOptions = normalizeOptions(questionOptions);

  return (
    <QuestionEditor
      prompt={questionPrompt}
      onPromptChange={setQuestionPrompt}
      snippet={questionSnippet}
      onSnippetChange={setQuestionSnippet}
      options={normalizedOptions}
      onOptionsChange={(options) => setQuestionOptions(toOptionObjects(options))}
      correctAnswer={correctAnswer}
      onCorrectAnswerChange={setCorrectAnswer}
      topics={questionTopics}
      selectedTopicNodeIds={topicsCovered}
      onSelectedTopicNodeIdsChange={setTopicsCovered}
      imageUrl={imageUrl}
      onImageUrlChange={setImageUrl}
      topicsLoading={topicsLoading}
      preferredTopicNodeIds={lessonTopicNodeIds}
      disabled={disabled}
      autoFocus
    />
  );
};

export default MultipleChoiceQuestion;
