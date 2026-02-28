
from langchain.tools import tool
from tavily import TavilyClient


tavily_client = TavilyClient()

@tool
def web_search(query: str) -> str:
    """
    Search the web for the given query and return a summary of the results.
    """
    search_results = tavily_client.search(query)
    return search_results
