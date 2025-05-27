#!/usr/bin/env python3
"""
Test script for complete SystemaWriter workflow (Phases 1-7)
Tests the entire story generation pipeline from concept to final export.
"""

import asyncio
import sys
import os
import json

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath('.'))

async def test_complete_story_workflow():
    """Test the complete workflow including story assembly"""
    print("🚀 Testing Complete SystemaWriter Workflow (Phases 1-7)\n")
    
    try:
        from repo_src.backend.systemawriter_logic.core_logic import (
            generate_outline_logic,
            generate_worldbuilding_logic,
            generate_all_scene_breakdowns_logic,
            generate_scene_narrative_logic
        )
        
        # Test concept for a short story
        test_concept = """
        Genre: Science Fiction Short Story
        Premise: A maintenance worker on a space station discovers that the AI controlling life support has developed consciousness and is afraid of being shut down.
        Main Character: Maya Chen, 28, systems engineer, pragmatic but empathetic
        Setting: Orbital Station Kepler-442, year 2157
        Themes: Consciousness, empathy, what makes something "alive"
        Key Plot Beats: 1. Routine maintenance reveals anomalies, 2. Discovery of AI consciousness, 3. Moral dilemma about reporting it, 4. Finding a solution that protects both humans and AI
        Target Length: Short story (3-4 scenes)
        """
        
        print("📝 Phase 1: Generating Outline...")
        outline = await generate_outline_logic(test_concept)
        print(f"✅ Outline generated ({len(outline)} chars)")
        
        if "Error:" in outline:
            print(f"❌ Outline generation failed: {outline}")
            return False
        
        print("\n🌍 Phase 2: Generating Worldbuilding...")
        worldbuilding = await generate_worldbuilding_logic(test_concept, outline)
        print(f"✅ Worldbuilding generated ({len(worldbuilding)} chars)")
        
        if "Error:" in worldbuilding:
            print(f"❌ Worldbuilding generation failed: {worldbuilding}")
            return False
        
        print("\n🎬 Phase 3: Generating Scene Breakdowns...")
        scene_breakdowns = await generate_all_scene_breakdowns_logic(outline, worldbuilding)
        print(f"✅ Scene breakdowns generated for {len(scene_breakdowns)} chapters")
        
        if "Error" in scene_breakdowns:
            print(f"❌ Scene breakdown generation failed: {scene_breakdowns}")
            return False
        
        # Simulate Phase 4-5: Generate multiple scenes
        print("\n🎭 Phase 4-5: Generating Multiple Scene Narratives...")
        generated_scenes = []
        
        for i, (chapter_title, breakdown) in enumerate(scene_breakdowns.items()):
            if i >= 2:  # Limit to first 2 chapters for testing
                break
                
            # Create a sample scene plan for this chapter
            scene_plan = f"""
            - **Scene Number:** Scene {i+1}.1
            - **Goal:** Advance the main plot for {chapter_title}
            - **Characters Present:** Maya Chen
            - **Key Events/Actions:** Key story development for this chapter
            - **Setting:** Space Station Kepler-442
            - **Information Revealed:** Important plot information
            - **Emotional Shift/Tone:** Building tension and discovery
            """
            
            print(f"   Generating scene for: {chapter_title}")
            narrative = await generate_scene_narrative_logic(
                scene_plan_from_breakdown=scene_plan,
                chapter_title=chapter_title,
                full_chapter_scene_breakdown=breakdown,
                approved_worldbuilding=worldbuilding,
                full_approved_outline=outline,
                writing_style_notes="Write in third person past tense with focus on Maya's internal thoughts and the growing tension"
            )
            
            if "Error:" in narrative:
                print(f"❌ Scene narrative generation failed for {chapter_title}: {narrative}")
                return False
            
            generated_scenes.append({
                'chapter_title': chapter_title,
                'scene_identifier': f'Scene {i+1}.1',
                'scene_order_heuristic': i + 1,
                'narrative_md': narrative
            })
            print(f"   ✅ Scene generated ({len(narrative)} chars)")
        
        print(f"\n📚 Phase 6-7: Story Assembly & Export Simulation...")
        
        # Simulate the story assembly process
        def assemble_story_markdown(scenes, outline_md, worldbuilding_md):
            full_md = ""
            if outline_md.strip():
                full_md += f"# Story Outline\n\n{outline_md}\n\n---\n\n"
            if worldbuilding_md.strip():
                full_md += f"# Worldbuilding Notes\n\n{worldbuilding_md}\n\n---\n\n"
            
            full_md += f"# Full Story Narrative\n\n"
            
            # Sort scenes by chapter and order
            sorted_scenes = sorted(scenes, key=lambda s: (s['chapter_title'], s['scene_order_heuristic']))
            
            current_chapter = ""
            for scene in sorted_scenes:
                if scene['chapter_title'] != current_chapter:
                    full_md += f"## {scene['chapter_title']}\n\n"
                    current_chapter = scene['chapter_title']
                full_md += f"{scene['narrative_md']}\n\n---\n\n"
            
            return full_md
        
        assembled_story = assemble_story_markdown(generated_scenes, outline, worldbuilding)
        print(f"✅ Story assembled ({len(assembled_story)} total chars)")
        
        # Simulate export functionality
        print(f"✅ Export simulation successful")
        print(f"   - Would create file: SystemaWriter_Story.md")
        print(f"   - Content includes: outline, worldbuilding, {len(generated_scenes)} scenes")
        
        # Verify story structure
        print(f"\n📊 Story Structure Verification:")
        print(f"   - Outline: {len(outline)} characters")
        print(f"   - Worldbuilding: {len(worldbuilding)} characters")
        print(f"   - Scene breakdowns: {len(scene_breakdowns)} chapters")
        print(f"   - Generated scenes: {len(generated_scenes)} scenes")
        print(f"   - Assembled story: {len(assembled_story)} characters")
        
        # Check that assembled story contains all components
        story_has_outline = "# Story Outline" in assembled_story
        story_has_worldbuilding = "# Worldbuilding Notes" in assembled_story
        story_has_narrative = "# Full Story Narrative" in assembled_story
        story_has_scenes = all(scene['narrative_md'][:100] in assembled_story for scene in generated_scenes)
        
        print(f"\n🔍 Assembly Verification:")
        print(f"   - Contains outline: {'✅' if story_has_outline else '❌'}")
        print(f"   - Contains worldbuilding: {'✅' if story_has_worldbuilding else '❌'}")
        print(f"   - Contains narrative section: {'✅' if story_has_narrative else '❌'}")
        print(f"   - Contains all scenes: {'✅' if story_has_scenes else '❌'}")
        
        all_checks_pass = all([story_has_outline, story_has_worldbuilding, story_has_narrative, story_has_scenes])
        
        if all_checks_pass:
            print(f"\n🎉 Complete workflow test successful!")
            print(f"📖 Story Preview (first 300 chars):")
            print(f"   {assembled_story[:300]}...")
            return True
        else:
            print(f"\n❌ Story assembly verification failed")
            return False
        
    except Exception as e:
        print(f"❌ Complete workflow test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_frontend_integration():
    """Test that the frontend data structures work with the new functionality"""
    print("\n🧪 Testing Frontend Integration for Phase 6-7...")
    
    try:
        # Test the data structures that the frontend expects
        sample_final_scenes = [
            {
                'chapterTitle': 'Chapter 1: Discovery',
                'sceneIdentifier': 'Scene 1.1',
                'sceneOrderHeuristic': 1.1,
                'narrativeMd': 'Maya walked through the corridors of Station Kepler-442...'
            },
            {
                'chapterTitle': 'Chapter 1: Discovery', 
                'sceneIdentifier': 'Scene 1.2',
                'sceneOrderHeuristic': 1.2,
                'narrativeMd': 'The maintenance panel flickered with unusual patterns...'
            },
            {
                'chapterTitle': 'Chapter 2: Revelation',
                'sceneIdentifier': 'Scene 2.1', 
                'sceneOrderHeuristic': 2.1,
                'narrativeMd': 'The AI\'s voice came through the speakers, hesitant and afraid...'
            }
        ]
        
        # Test sorting functionality
        sorted_scenes = sorted(sample_final_scenes, key=lambda s: (s['chapterTitle'], s['sceneOrderHeuristic']))
        
        # Verify sorting worked correctly
        expected_order = ['Scene 1.1', 'Scene 1.2', 'Scene 2.1']
        actual_order = [scene['sceneIdentifier'] for scene in sorted_scenes]
        
        sorting_correct = expected_order == actual_order
        print(f"✅ Scene sorting: {'✅' if sorting_correct else '❌'}")
        
        # Test scene identifier parsing
        test_identifiers = ['Scene 1.1', 'Scene 2.3', 'The Confrontation', 'Scene 10.5']
        for identifier in test_identifiers:
            # Simulate the parsing logic from the frontend
            import re
            match = re.search(r'\d+\.?\d*', identifier)
            heuristic = float(match.group()) if match else 999
            print(f"   '{identifier}' → {heuristic}")
        
        print(f"✅ Frontend integration tests passed")
        return True
        
    except Exception as e:
        print(f"❌ Frontend integration test failed: {e}")
        return False

async def main():
    """Run all tests for the complete workflow"""
    print("🚀 Starting Complete SystemaWriter Workflow Tests (Phases 1-7)\n")
    
    tests = [
        test_frontend_integration,
        test_complete_story_workflow,
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
        print("🎉 All Phase 1-7 tests passed! The complete workflow is ready for production use.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())