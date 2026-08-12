# Lab 1 — AI Use and Reflection

**LLM/agent used:** Antigravity for coding agent with Gemini 3.6 Flash (Medium) and Claude Sonnet 4.6 (Thinking) as the LLM and Gemini (Chatbot) for general knowledge and guide my workflow to save token usage.

## Selected key prompts:
| # | Prompt Name | Actual Propmt Text | My Reflection |
|---|-------------|--------------------|---------------|
| 1 | Implement issue 2 | Implement the API health check <br> Type: Feature <br> Required branch: feature/2-health-check <br> Acceptance criteria: <br> GET /api/health returns HTTP 200. <br> The JSON response contains status = ok and service = TokTickIT API. <br> A Supertest test verifies the endpoint. <br> The React page displays the backend status based on a real API call. <br> A useful error message appears when the backend is unavailable. <br> | He does it follow the criteria but I didn't really understand what he did and not in the scope for example he used sql query in client directly instead of Prisma ORM. |
| 2 | Plan the Lab | (Lab1_Labsheet.pdf) Check these pdf to ensure condition, stacks to use before excute. I'll give tasks to do, do not add functions beyond task scope, write down what you have done and explain what that part of code is and what it do to this project in docs/lab-01/fin.md | This time, I gave labsheet and wrote an agreement for him to use Tech Stack assigned and only do task in scope. I also asked him to write code explaination in fin.md so I can read and learn what he did to the code later. |
| 3 | Implement issue 2 | Implement the API health check <br> Type: Feature <br> Required branch: feature/2-health-check <br> Acceptance criteria: <br> GET /api/health returns HTTP 200. <br> The JSON response contains status = ok and service = TokTickIT API. <br> A Supertest test verifies the endpoint. <br> The React page displays the backend status based on a real API call. <br> A useful error message appears when the backend is unavailable. <br> | I gave the same propmt and everything was working great. |

## Reflection
Two or three sentences: what made your prompts better, and one place you had to
correct or reject what the agent produced.
