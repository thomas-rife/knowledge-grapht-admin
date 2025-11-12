import { QuestionContextProvider } from '@/contexts/question-context'

const QuestionPageLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) => {
  return <QuestionContextProvider>{children}</QuestionContextProvider>
}

export default QuestionPageLayout
