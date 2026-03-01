import base64
from langchain.agents import create_agent
from langchain.messages import HumanMessage
from openai import RateLimitError
from web_search import web_search
from exceptions import APIRateLimitException
from langchain_aws import ChatBedrock


class ProcessImage:
    def __init__(self, image):
        self.image = image
        aws_llm = ChatBedrock(model="apac.amazon.nova-lite-v1:0", region="ap-south-1")
        system_prompt = "Use your tools only and answer the questions. Don't use your knowledge base to answer. Answer should be one liner"
        self.recipe_agent = create_agent(aws_llm, tools=[web_search], system_prompt=system_prompt)
        self.agent = create_agent(aws_llm)

    @staticmethod
    def _raise_rate_limit_exception(error: RateLimitError, source: str) -> None:
        response = getattr(error, "response", None)
        headers = getattr(response, "headers", {}) or {}
        body = getattr(error, "body", {}) or {}

        retry_after = headers.get("retry-after") or headers.get("Retry-After")
        details = {
            "source": source,
            "status_code": getattr(error, "status_code", 429),
            "code": body.get("code") if isinstance(body, dict) else None,
            "type": body.get("type") if isinstance(body, dict) else "rate_limit_error",
            "retry_after": retry_after,
        }

        raise APIRateLimitException(
            message="OpenAI rate limit exceeded. Please retry after some time.",
            details=details,
        ) from error

    def _get_img_base64(self) -> str:
        img_bytes = self.image.getvalue()
        img_b64 = base64.encodebytes(img_bytes).decode('utf-8')
        return img_b64
    
    def _get_image_contents(self) -> str:
        img_b64 = self._get_img_base64()
        multi_model_question = HumanMessage([
            {"type": "text", "text": "List all items shown in the image. Answer in one liner. If the items are not food items then return a message saying 'No food items found in the image'"},
            {"type": "image", "base64": img_b64, "mime_type": "image/png"}
        ])
        try:
            response = self.agent.invoke({
                "messages": multi_model_question
            })
        except RateLimitError as error:
            self._raise_rate_limit_exception(error, source="image_contents_invoke")

        print("Agent response: ", response["messages"][-1].content)
        return response["messages"][-1].content

    def _get_dishes_list(self, food_items_list: str) -> str:

        question = f"List all dishes that can be made with the following food items: {food_items_list}. Answer in one liner like 'You can make following dishes with given ingredients: ...' I will be printing the response on HTML page so include that unordered/ordered list formatting as well."
        try:
            response = self.recipe_agent.invoke({
                "messages": [HumanMessage(content=question)]
            })
        except RateLimitError as error:
            self._raise_rate_limit_exception(error, source="recipe_invoke")

        print("Receipe agent response: ", response["messages"][-1].content)
        return response["messages"][-1].content

    def process(self):
        # Placeholder for image processing logic
        print(f"Processing image at: {self.image}")
        
        image_contents = self._get_image_contents()
        print("Response : ", image_contents)
        if "No food items found in the image" in image_contents:
            return "No food items found in the image"
        dishes_list = self._get_dishes_list(image_contents)
        return dishes_list
