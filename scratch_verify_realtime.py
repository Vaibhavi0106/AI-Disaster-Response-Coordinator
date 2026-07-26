from agents.disaster_agent import DisasterAgent

def test_realtime_variation():
    agent = DisasterAgent()
    queries = ["Flood in Mumbai", "Earthquake in Tokyo", "Wildfire in Sydney"]
    
    print("=" * 60)
    print("VERIFYING REAL-TIME & QUERY-SPECIFIC DYNAMIC TELEMETRY")
    print("=" * 60)
    
    for q in queries:
        res = agent.analyze_disaster(q)
        w = res.get("weather_metrics", {})
        p = res.get("predictive_intelligence", {})
        c = res.get("ai_consensus_engine", {})
        locs = res.get("affected_locations", [])
        lat = locs[0]["lat"] if locs else "N/A"
        lng = locs[0]["lng"] if locs else "N/A"

        print(f"\nQuery: '{q}'")
        print(f"  • Disaster Type: {res.get('disaster_type')}")
        print(f"  • Coordinates: Lat {lat}, Lng {lng}")
        print(f"  • Live Weather: {w.get('temp')} | {w.get('precipitation')} | {w.get('wind')} ({w.get('status')})")
        print(f"  • Impact Radius: {res.get('impact_radius')} | Risk Index: {res.get('risk_index')}")
        print(f"  • Predictions: Escalation={p.get('escalation_risk', {}).get('value')}, Hospital={p.get('hospital_load', {}).get('value')}, Road={p.get('road_accessibility', {}).get('value')}")
        print(f"  • Overall Consensus Conf: {c.get('overall_consensus_confidence')}")
        print(f"  • First Shelter: {res.get('evacuation_shelters', [{}])[0].get('name')}")
        print("-" * 60)

if __name__ == "__main__":
    test_realtime_variation()
