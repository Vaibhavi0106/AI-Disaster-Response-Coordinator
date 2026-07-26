import json
import logging
from config import Config
from agents.search_agent import SearchAgent
from utils.prompts import DISASTER_ANALYSIS_SYSTEM_PROMPT, COPILOT_SYSTEM_PROMPT
from utils.parser import parse_disaster_json

logger = logging.getLogger(__name__)

class DisasterAgent:
    """
    Main LangChain Disaster Response Coordinator Agent.
    Executes OpenAI LLM + Tavily Search processing with complete telemetry extraction.
    """

    def __init__(self, search_agent: SearchAgent = None):
        self.search_agent = search_agent or SearchAgent()
        self.openai_key = Config.OPENAI_API_KEY

    def analyze_disaster(self, query: str) -> dict:
        """
        Executes LangChain + OpenAI disaster analysis based on live Tavily search results.
        Returns a complete, validated disaster telemetry payload.
        """
        if not self.openai_key:
            logger.error("OpenAI API Key is missing from .env configuration.")
            raise RuntimeError("OpenAI API Key is missing. Please set OPENAI_API_KEY in your .env file.")

        # 1. Execute Tavily Search
        search_data = self.search_agent.search_disaster_info(query)
        search_context = search_data.get("search_context", "")
        sources = search_data.get("sources", [])

        try:
            from langchain_openai import ChatOpenAI
            from langchain_core.prompts import ChatPromptTemplate

            llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.2,
                api_key=self.openai_key
            )

            # 2. Master LLM Analysis Call
            logger.info(f"✓ OpenAI Request Started for query: '{query}'")
            prompt_template = ChatPromptTemplate.from_messages([
                ("system", DISASTER_ANALYSIS_SYSTEM_PROMPT)
            ])
            chain = prompt_template | llm
            res = chain.invoke({"query": query, "search_context": search_context})
            logger.info("✓ OpenAI Response Received")

            raw_response = res.content
            final_data = parse_disaster_json(raw_response)
            
            if sources:
                existing_sources = final_data.get("sources", [])
                all_sources = list(dict.fromkeys(existing_sources + sources))
                final_data["sources"] = all_sources

            return final_data

        except Exception as e:
            logger.error(f"OpenAI LLM Processing Failure: {str(e)}")
            raise RuntimeError(f"OpenAI processing error: {str(e)}")

    def answer_copilot_question(self, user_message: str, context: dict) -> str:
        """
        Answers natural language Copilot questions using OpenAI LLM grounded in current telemetry.
        """
        if not user_message:
            return "Current data does not contain this information."

        if not self.openai_key:
            return "Current data does not contain this information. OpenAI API key is missing."

        try:
            from langchain_openai import ChatOpenAI
            from langchain_core.prompts import ChatPromptTemplate

            llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.2,
                api_key=self.openai_key
            )

            prompt_template = ChatPromptTemplate.from_messages([
                ("system", COPILOT_SYSTEM_PROMPT),
                ("human", "{user_message}")
            ])

            chain = prompt_template | llm
            response = chain.invoke({
                "context_json": json.dumps(context, indent=2),
                "user_message": user_message
            })
            return response.content.strip()

        except Exception as e:
            logger.error(f"Copilot LLM invocation error: {e}")
            return "Current data does not contain this information."
