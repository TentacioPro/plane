#!/usr/bin/env python3
"""
Test script for Plane Bulk Import APIs
Tests all scenarios: states, labels, modules, cycles, pages, issues
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:3005"
WORKSPACE_SLUG = "projects"
PROJECT_ID = "672e6e8b-1614-4a48-bf51-fdb143482b06"  # secondBrain project
API_TOKEN = "plane_test_bulk_import_token_2024"

# We need to get a session cookie - let's use the API directly
session = requests.Session()
session.headers.update({
    "X-API-Key": API_TOKEN,
    "Content-Type": "application/json"
})

def print_result(name, response):
    """Print test result"""
    status = "✓" if response.status_code in [200, 201] else "✗"
    print(f"{status} {name}: {response.status_code}")
    if response.status_code not in [200, 201]:
        try:
            print(f"  Error: {response.json()}")
        except:
            print(f"  Error: {response.text[:200]}")
    else:
        try:
            data = response.json()
            if isinstance(data, dict) and 'id' in data:
                print(f"  Created ID: {data['id']}")
            elif isinstance(data, dict) and 'name' in data:
                print(f"  Name: {data['name']}")
        except:
            pass
    return response.status_code in [200, 201]

def test_create_state():
    """Test creating a state"""
    url = f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/states/"
    data = {
        "name": f"Test State {datetime.now().strftime('%H%M%S')}",
        "color": "#3B82F6",
        "group": "started",
        "description": "Test state created by bulk import test"
    }
    response = session.post(url, json=data)
    return print_result("Create State", response), response

def test_create_label():
    """Test creating a label"""
    url = f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/labels/"
    data = {
        "name": f"test-label-{datetime.now().strftime('%H%M%S')}",
        "color": "#EF4444",
        "description": "Test label created by bulk import test"
    }
    response = session.post(url, json=data)
    return print_result("Create Label", response), response

def test_create_module():
    """Test creating a module"""
    url = f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/modules/"
    data = {
        "name": f"Test Module {datetime.now().strftime('%H%M%S')}",
        "description": "Test module created by bulk import test",
        "status": "planned",
        "start_date": datetime.now().strftime("%Y-%m-%d"),
        "target_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    }
    response = session.post(url, json=data)
    return print_result("Create Module", response), response

def test_create_cycle():
    """Test creating a cycle"""
    url = f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/cycles/"
    data = {
        "name": f"Test Sprint {datetime.now().strftime('%H%M%S')}",
        "description": "Test cycle created by bulk import test",
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=14)).isoformat(),
        "project_id": PROJECT_ID
    }
    response = session.post(url, json=data)
    return print_result("Create Cycle", response), response

def test_create_page():
    """Test creating a page (uses session auth, not API key)"""
    # Pages use the regular API endpoint, not /api/v1/
    url = f"{BASE_URL}/api/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/pages/"
    data = {
        "name": f"Test Page {datetime.now().strftime('%H%M%S')}",
        "description_html": "<h1>Test Page</h1><p>This is a test page created by bulk import test.</p>",
        "access": 0  # 0 = public, 1 = private
    }
    response = session.post(url, json=data)
    return print_result("Create Page", response), response

def test_create_issue(state_id=None, label_id=None):
    """Test creating an issue"""
    url = f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/issues/"
    data = {
        "name": f"Test Issue {datetime.now().strftime('%H%M%S')}",
        "description_html": "<p>Test issue created by bulk import test</p>",
        "priority": "high",
        "start_date": datetime.now().strftime("%Y-%m-%d"),
        "target_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
        "assignees": [],
        "labels": []
    }
    if state_id:
        data["state"] = state_id
    if label_id:
        data["labels"] = [label_id]
    
    response = session.post(url, json=data)
    return print_result("Create Issue", response), response

def test_create_issue_with_refs(state_id=None, label_id=None):
    """Test creating an issue with state and label references"""
    url = f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/issues/"
    data = {
        "name": f"Test Issue Refs {datetime.now().strftime('%H%M%S')}",
        "description_html": "<p>Test issue with references</p>",
        "priority": "medium",
        "assignees": [],
        "labels": []
    }
    if state_id:
        data["state"] = state_id
    if label_id:
        data["labels"] = [label_id]
    
    response = session.post(url, json=data)
    return print_result("Create Issue (with refs)", response), response

def test_get_existing_states():
    """Get existing states to use for issue creation"""
    url = f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/states/"
    response = session.get(url)
    if response.status_code == 200:
        states = response.json()
        if states:
            print(f"  Found {len(states)} existing states")
            return states[0].get('id') if isinstance(states, list) else None
    return None

def test_full_project_import():
    """Test importing a full project with multiple entity types"""
    print("  Simulating full project import...")
    
    ts = datetime.now().strftime('%H%M%S')
    full_project = {
        "states": [
            {"name": f"FP Backlog {ts}", "color": "#6B7280", "group": "backlog"},
            {"name": f"FP Done {ts}", "color": "#10B981", "group": "completed"}
        ],
        "labels": [
            {"name": f"fp-bug-{ts}", "color": "#EF4444"},
            {"name": f"fp-feature-{ts}", "color": "#3B82F6"}
        ],
        "modules": [
            {"name": f"FP Module {ts}", "status": "planned"}
        ],
        "cycles": [
            {
                "name": f"FP Sprint {ts}",
                "start_date": datetime.now().isoformat(),
                "end_date": (datetime.now() + timedelta(days=14)).isoformat(),
                "project_id": PROJECT_ID
            }
        ],
        "issues": [
            {"name": f"FP Task 1 {ts}", "priority": "high", "assignees": [], "labels": []},
            {"name": f"FP Task 2 {ts}", "priority": "medium", "assignees": [], "labels": []}
        ]
    }
    
    total_success = 0
    total_failed = 0
    
    import_order = [
        ("states", f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/states/"),
        ("labels", f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/labels/"),
        ("modules", f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/modules/"),
        ("cycles", f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/cycles/"),
        ("issues", f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_SLUG}/projects/{PROJECT_ID}/issues/"),
    ]
    
    for entity_type, url in import_order:
        items = full_project.get(entity_type, [])
        for item in items:
            response = session.post(url, json=item)
            if response.status_code in [200, 201]:
                total_success += 1
            else:
                total_failed += 1
                print(f"    ✗ {entity_type}: {response.status_code}")
    
    print(f"  Full project import: {total_success} succeeded, {total_failed} failed")
    return total_failed == 0

def run_all_tests():
    """Run all API tests"""
    print("=" * 60)
    print("PLANE BULK IMPORT API TESTS")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Workspace: {WORKSPACE_SLUG}")
    print(f"Project: {PROJECT_ID}")
    print("=" * 60)
    
    results = {"passed": 0, "failed": 0}
    
    print("\n[1] Testing State Creation...")
    success, state_resp = test_create_state()
    results["passed" if success else "failed"] += 1
    state_id = state_resp.json().get('id') if success else None
    
    print("\n[2] Testing Label Creation...")
    success, label_resp = test_create_label()
    results["passed" if success else "failed"] += 1
    label_id = label_resp.json().get('id') if success else None
    
    print("\n[3] Testing Module Creation...")
    success, _ = test_create_module()
    results["passed" if success else "failed"] += 1
    
    print("\n[4] Testing Cycle Creation...")
    success, _ = test_create_cycle()
    results["passed" if success else "failed"] += 1
    
    print("\n[5] Testing Page Creation...")
    success, _ = test_create_page()
    results["passed" if success else "failed"] += 1
    
    print("\n[6] Testing Issue Creation (basic)...")
    success, _ = test_create_issue()
    results["passed" if success else "failed"] += 1
    
    print("\n[7] Testing Issue Creation (with state & label)...")
    success, _ = test_create_issue_with_refs(state_id=state_id, label_id=label_id)
    results["passed" if success else "failed"] += 1
    
    print("\n[8] Testing Full Project Import...")
    success = test_full_project_import()
    results["passed" if success else "failed"] += 1
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Passed: {results['passed']}")
    print(f"Failed: {results['failed']}")
    print(f"Total:  {results['passed'] + results['failed']}")
    
    if results['failed'] == 0:
        print("\n✓ All tests passed! Backend APIs are working correctly.")
    else:
        print(f"\n✗ {results['failed']} test(s) failed.")
    
    return results

if __name__ == "__main__":
    run_all_tests()
