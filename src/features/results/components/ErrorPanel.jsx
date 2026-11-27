import { Button, EmptyState } from "@/components/ui";

/**
 * Error state with a retry. 403 / 404 get plain wording that does not reveal whether the record exists.
 * @param {{ error: any, onRetry?: () => void, backHref?: string, backLabel?: string, what?: string }} props
 */
export default function ErrorPanel({ error, onRetry, backHref, backLabel = "Back to quizzes", what = "this page" }) {
  const status = error?.status;
  let title = `Could not load ${what}`;
  let text = error?.message || "Something went wrong. Please try again.";
  const retryable = !status || status >= 500 || status === 429;
  if (status === 400) {
    title = "That link is not valid";
    text = "Check the address, or go back to your quizzes and open it from there.";
  } else if (status === 403 || status === 404) {
    title = "Not available";
    text = "This does not exist, or it belongs to another teacher's quiz, so you cannot open it.";
  } else if (status === 0) {
    title = "Cannot reach the server";
  }
  return (
    <div role="alert">
      <EmptyState
        title={title}
        action={
          <>
            {onRetry && retryable ? (
              <Button variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            ) : null}
            {backHref ? (
              <Button href={backHref} variant={onRetry && retryable ? "ghost" : "secondary"}>
                {backLabel}
              </Button>
            ) : null}
          </>
        }
      >
        {text}
      </EmptyState>
    </div>
  );
}
