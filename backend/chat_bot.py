from langchain.agents import create_agent
from langchain.messages import HumanMessage
from openai import RateLimitError
from exceptions import APIRateLimitException
from langchain_aws import ChatBedrock


class ChatBot:

    def __init__(self):
        aws_llm = ChatBedrock(model="apac.amazon.nova-micro-v1:0", region="ap-south-1")
        system_prompt = "You are a helpful Chef assistant. Answer the user's questions to the best of your ability. I will be printing the answer in HTML page so include proper formatting in the response as well. Also answer only questions related to cooking, recipes, food and restaurants. If the question is not related to these topics then answer with 'Sorry, I can only answer questions related to cooking, recipes, food and restaurants.'"
        self.agent = create_agent(aws_llm, system_prompt=system_prompt)

    def chat(self, user_message: str) -> str:
        try:
            response = self.agent.invoke({
                "messages": [HumanMessage(content=user_message)]
            })
        except RateLimitError as error:
            response_obj = getattr(error, "response", None)
            headers = getattr(response_obj, "headers", {}) or {}
            body = getattr(error, "body", {}) or {}

            raise APIRateLimitException(
                message="OpenAI rate limit exceeded. Please retry after some time.",
                details={
                    "source": "chat_invoke",
                    "status_code": getattr(error, "status_code", 429),
                    "code": body.get("code") if isinstance(body, dict) else None,
                    "type": body.get("type") if isinstance(body, dict) else "rate_limit_error",
                    "retry_after": headers.get("retry-after") or headers.get("Retry-After"),
                },
            ) from error

        print("Response: ", response)
        return response["messages"][-1].content