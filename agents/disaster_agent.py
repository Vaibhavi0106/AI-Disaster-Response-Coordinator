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
        Falls back seamlessly to demonstration analysis engine if API keys are missing or fail.
        """
        # 1. Execute Tavily Search (handles missing key gracefully)
        search_data = self.search_agent.search_disaster_info(query)
        search_context = search_data.get("search_context", f"Emergency query: '{query}'")
        sources = search_data.get("sources", [])

        # 2. Try Live OpenAI LLM if key is available
        if self.openai_key:
            try:
                from langchain_openai import ChatOpenAI
                from langchain_core.prompts import ChatPromptTemplate

                llm = ChatOpenAI(
                    model="gpt-4o-mini",
                    temperature=0.2,
                    api_key=self.openai_key,
                    max_retries=1,
                    request_timeout=5
                )

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
                logger.warning(f"OpenAI LLM processing error: {e}. Falling back to resilient analysis engine.")

        # 3. Demonstration Fallback Mode
        logger.info(f"Using resilient fallback analysis engine for query: '{query}'")
        fallback_json = parse_disaster_json({"summary": f"Emergency situation reported for {query}. Ground telemetry active."})
        if sources:
            fallback_json["sources"] = list(dict.fromkeys(fallback_json.get("sources", []) + sources))
        return fallback_json

    def answer_copilot_question(self, user_message: str, context: dict) -> str:
        """
        Answers natural language Copilot questions using OpenAI LLM grounded in current telemetry,
        or grounded rule-based operational fallback when LLM is unavailable.
        """
        if not user_message:
            return "Current data does not contain this information."

        if self.openai_key:
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
                logger.warning(f"Copilot LLM invocation error: {e}. Falling back to rule-based response.")

        # Grounded Operational Fallback for Copilot
        msg_lower = user_message.lower()
        
        if "summary" in msg_lower or "situation" in msg_lower or "brief" in msg_lower:
            return context.get("summary") or context.get("executive_command_brief", {}).get("summary") or f"Active disaster telemetry for {context.get('disaster_type', 'current emergency')}."
            
        if "action" in msg_lower or "do first" in msg_lower or "responder" in msg_lower or "priority" in msg_lower:
            return context.get("executive_command_brief", {}).get("priorities") or context.get("executive_command_brief", {}).get("actions") or "1. Conduct immediate life evacuation. 2. Deploy medical squads. 3. Secure utility grids."
            
        if "hospital" in msg_lower or "medical" in msg_lower:
            contacts = [f"{c.get('label')}: {c.get('number')}" for c in context.get("emergency_contacts", [])]
            return f"Medical Response Teams dispatched. Emergency Contacts: {', '.join(contacts)}." if contacts else "Medical field units deployed. Call 108 for emergency ambulance."
            
        if "resource" in msg_lower or "team" in msg_lower or "squad" in msg_lower:
            resources = context.get("recommended_resources", [])
            return f"Recommended Rescue Assets: {', '.join(resources)}." if resources else "Specialized NDRF/SDRF squads, dewatering pumps, and field medical units are recommended."
            
        if "why" in msg_lower or "reason" in msg_lower or "severity" in msg_lower or "decision" in msg_lower:
            return context.get("ai_decision_intelligence", {}).get("severity_reasoning") or f"Classified as {context.get('severity', 'High')} severity due to life safety risks, high population impact, and infrastructure impairment."
            
        if "advisory" in msg_lower or "public" in msg_lower or "safety" in msg_lower:
            safety = context.get("safety_measures", [])
            return f"Public Advisories: {'. '.join(safety)}" if safety else "Evacuate low-lying areas and follow local EOC guidance."

        summary = context.get("summary", "")
        d_type = context.get("disaster_type", "Emergency")
        return f"Regarding {d_type}: {summary} Please review the command dashboard telemetry for full operational details."
