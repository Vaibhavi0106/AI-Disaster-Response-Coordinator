import logging
from config import Config

logger = logging.getLogger(__name__)

class SearchAgent:
    """Agent responsible for querying Tavily Search API for real live disaster reports."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.TAVILY_API_KEY

    def search_disaster_info(self, query: str) -> dict:
        """
        Queries Tavily Search API for the given query input.
        Returns live web search results and source links.
        """
        if not self.api_key:
            logger.warning("Tavily API Key is missing. Search functionality will be limited to query context.")
            return {
                "query": query,
                "search_context": f"Live emergency disaster query: '{query}'. Ground truth location reports requested.",
                "sources": [],
                "mode": "no_tavily_key"
            }

        logger.info(f"✓ Tavily Search Started for query: '{query}'")
        try:
            from tavily import TavilyClient
            tavily_client = TavilyClient(api_key=self.api_key)
            response = tavily_client.search(
                query=f"current weather emergency status breaking news {query}",
                search_depth="advanced",
                max_results=5
            )
            
            results = response.get("results", [])
            snippets = [res.get("content", "") for res in results if res.get("content")]
            sources = [res.get("url", "") for res in results if res.get("url")]
            
            combined_text = "\n\n".join(snippets)
            logger.info(f"✓ Tavily Search Completed with {len(results)} results.")
            
            return {
                "query": query,
                "search_context": combined_text if combined_text else f"Live emergency query: '{query}'",
                "sources": sources,
                "raw_results": results,
                "mode": "live_tavily"
            }
        except Exception as e:
            logger.warning(f"Tavily Search Execution Failed: {str(e)}. Returning fallback context.")
            return {
                "query": query,
                "search_context": f"Live emergency disaster query: '{query}'. Ground truth location reports requested.",
                "sources": [],
                "mode": "fallback"
            }
