#!/usr/bin/env python3
"""
Test script for Phase 3-5 workflow in SystemaWriter
Tests scene decomposition, scene generation, and revision capabilities.
"""

import asyncio
import sys
import os
import json

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath('.'))

async def test_complete_workflow():
    """Test the complete workflow from concept to scene narrative"""
    print("🚀 Testing Complete SystemaWriter Workflow (Phases 1-5)\n")
    
    try:
        from repo_src.backend.systemawriter_logic.core_logic import (
            generate_outline_logic,
            generate_worldbuilding_logic,
            generate_all_scene_breakdowns_logic,
            generate_scene_narrative_logic
        )
        
        # Test concept
        test_concept = """
        Genre: Fantasy Adventure
        Premise: A young blacksmith discovers an ancient dragon egg and must protect it from dark forces while learning to communicate with the dragon within.
        Main Character: Kael, 19, apprentice blacksmith, brave but inexperienced
        Setting: Medieval fantasy kingdom of Aethermoor
        Themes: Coming of age, responsibility, the bond between human and dragon
        Key Plot Beats: 1. Discovery of egg, 2. First dragon contact, 3. Dark forces attack, 4. Journey to safety, 5. Final confrontation
        """
        
        print("📝 Step 1: Generating Outline...")
        outline = await generate_outline_logic(test_concept)
        print(f"✅ Outline generated ({len(outline)} chars)")
        print(f"   Preview: {outline[:150]}...")
        
        if "Error:" in outline:
            print(f"❌ Outline generation failed: {outline}")
            return False
        
        print("\n🌍 Step 2: Generating Worldbuilding...")
        worldbuilding = await generate_worldbuilding_logic(test_concept, outline)
        print(f"✅ Worldbuilding generated ({len(worldbuilding)} chars)")
        print(f"   Preview: {worldbuilding[:150]}...")
        
        if "Error:" in worldbuilding:
            print(f"❌ Worldbuilding generation failed: {worldbuilding}")
            return False
        
        print("\n🎬 Step 3: Generating Scene Breakdowns...")
        scene_breakdowns = await generate_all_scene_breakdowns_logic(outline, worldbuilding)
        print(f"✅ Scene breakdowns generated for {len(scene_breakdowns)} chapters")
        
        if "Error" in scene_breakdowns:
            print(f"❌ Scene breakdown generation failed: {scene_breakdowns}")
            return False
        
        # Display breakdown structure
        for chapter_title, breakdown in scene_breakdowns.items():
            print(f"   📖 {chapter_title}: {len(breakdown)} chars")
        
        print("\n🎭 Step 4: Testing Scene Narrative Generation...")
        # Pick the first chapter and create a sample scene plan
        first_chapter = list(scene_breakdowns.keys())[0]
        first_breakdown = scene_breakdowns[first_chapter]
        
        # Extract a sample scene plan (simplified - in real UI, user would copy-paste)
        sample_scene_plan = """
        - **Scene Number:** Scene 1.1
        - **Goal:** Introduce Kael in his ordinary world as a blacksmith apprentice
        - **Characters Present:** Kael, Master Thorne (blacksmith)
        - **Key Events/Actions:** Kael working at the forge, discovering unusual properties in a piece of metal
        - **Setting:** Thorne's blacksmith shop in the village of Millhaven
        - **Information Revealed:** Kael has an unusual sensitivity to magical metals
        - **Emotional Shift/Tone:** Curious, anticipatory
        """
        
        narrative = await generate_scene_narrative_logic(
            scene_plan_from_breakdown=sample_scene_plan,
            chapter_title=first_chapter,
            full_chapter_scene_breakdown=first_breakdown,
            approved_worldbuilding=worldbuilding,
            full_approved_outline=outline,
            writing_style_notes="Write in third person past tense with vivid sensory details"
        )
        
        print(f"✅ Scene narrative generated ({len(narrative)} chars)")
        print(f"   Preview: {narrative[:200]}...")
        
        if "Error:" in narrative:
            print(f"❌ Scene narrative generation failed: {narrative}")
            return False
        
        print("\n🔄 Step 5: Testing Regeneration with Different Style...")
        narrative_v2 = await generate_scene_narrative_logic(
            scene_plan_from_breakdown=sample_scene_plan,
            chapter_title=first_chapter,
            full_chapter_scene_breakdown=first_breakdown,
            approved_worldbuilding=worldbuilding,
            full_approved_outline=outline,
            writing_style_notes="Write with more focus on Kael's internal thoughts and emotions"
        )
        
        print(f"✅ Scene narrative regenerated ({len(narrative_v2)} chars)")
        print(f"   Preview: {narrative_v2[:200]}...")
        
        if "Error:" in narrative_v2:
            print(f"❌ Scene narrative regeneration failed: {narrative_v2}")
            return False
        
        print("\n🎉 Complete workflow test successful!")
        print(f"📊 Summary:")
        print(f"   - Outline: {len(outline)} characters")
        print(f"   - Worldbuilding: {len(worldbuilding)} characters") 
        print(f"   - Scene breakdowns: {len(scene_breakdowns)} chapters")
        print(f"   - Scene narrative: {len(narrative)} characters")
        print(f"   - Regenerated narrative: {len(narrative_v2)} characters")
        
        return True
        
    except Exception as e:
        print(f"❌ Workflow test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_frontend_data_structures():
    """Test that the data structures match what the frontend expects"""
    print("\n🧪 Testing Frontend Data Structure Compatibility...")
    
    try:
        from repo_src.backend.systemawriter_logic.core_logic import generate_all_scene_breakdowns_logic
        
        # Simple test data
        outline = "## Chapter 1: Beginning\n- Hero starts journey\n## Chapter 2: Middle\n- Hero faces challenges"
        worldbuilding = "## Main Characters\n### Hero\n- Brave adventurer\n## Setting Details\n- Fantasy realm"
        
        breakdowns = await generate_all_scene_breakdowns_logic(outline, worldbuilding)
        
        # Verify structure matches SceneBreakdownData interface
        if not isinstance(breakdowns, dict):
            print(f"❌ Expected dict, got {type(breakdowns)}")
            return False
        
        for chapter_title, breakdown_md in breakdowns.items():
            if not isinstance(chapter_title, str):
                print(f"❌ Chapter title should be string, got {type(chapter_title)}")
                return False
            if not isinstance(breakdown_md, str):
                print(f"❌ Breakdown should be string, got {type(breakdown_md)}")
                return False
        
        print(f"✅ Frontend data structure compatibility verified")
        print(f"   - Chapters: {list(breakdowns.keys())}")
        print(f"   - All values are strings: {all(isinstance(v, str) for v in breakdowns.values())}")
        
        return True
        
    except Exception as e:
        print(f"❌ Frontend compatibility test failed: {e}")
        return False

async def test_api_endpoints():
    """Test that API endpoints work correctly"""
    print("\n🌐 Testing API Endpoint Compatibility...")
    
    try:
        from repo_src.backend.data.systemawriter_schemas import (
            GenerateSceneBreakdownsSchema,
            SceneBreakdownsResponseSchema,
            GenerateSceneNarrativeSchema,
            SceneNarrativeResponseSchema
        )
        
        # Test schema validation
        breakdown_request = GenerateSceneBreakdownsSchema(
            approved_outline_md="## Chapter 1: Test\n- Test content",
            approved_worldbuilding_md="## Characters\n### Hero\n- Test character"
        )
        
        narrative_request = GenerateSceneNarrativeSchema(
            scene_plan_from_breakdown="Test scene plan",
            chapter_title="Chapter 1: Test",
            full_chapter_scene_breakdown="Full breakdown text",
            approved_worldbuilding_md="Worldbuilding text",
            full_approved_outline_md="Outline text",
            writing_style_notes="Test style notes"
        )
        
        print("✅ API schemas validate correctly")
        print(f"   - Breakdown request: {breakdown_request.approved_outline_md[:50]}...")
        print(f"   - Narrative request: {narrative_request.chapter_title}")
        
        return True
        
    except Exception as e:
        print(f"❌ API endpoint test failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting SystemaWriter Phase 3-5 Workflow Tests\n")
    
    tests = [
        test_frontend_data_structures,
        test_api_endpoints,
        test_complete_workflow,
    ]
    
    results = []
    for test in tests:
        try:
            result = await test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            results.append(False)
    
    print(f"\n📊 Test Results Summary:")
    print(f"   Passed: {sum(results)}/{len(results)}")
    print(f"   Failed: {len(results) - sum(results)}/{len(results)}")
    
    if all(results):
        print("🎉 All Phase 3-5 tests passed! The workflow is ready for use.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main()) 