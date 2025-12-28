#!/usr/bin/env python3
"""
Script to mark user profile as onboarded
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plane.settings.production')
sys.path.insert(0, '/code')
django.setup()

from plane.db.models import User, Profile

try:
    user = User.objects.get(email="maharajanabishek@gmail.com")
    profile = user.profile
    
    # Mark profile as onboarded
    profile.is_onboarded = True
    profile.is_tour_completed = True
    profile.onboarding_step = {
        "profile_complete": True,
        "workspace_create": True,
        "workspace_invite": True,
        "workspace_join": True,
    }
    profile.save()
    
    print(f"✓ User profile marked as onboarded!")
    print(f"  User: {user.email}")
    print(f"  Is onboarded: {profile.is_onboarded}")
    print(f"  Tour completed: {profile.is_tour_completed}")
    print(f"  Onboarding steps: {profile.onboarding_step}")
    
except User.DoesNotExist:
    print("✗ User not found!")
    sys.exit(1)
except Exception as e:
    print(f"✗ Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
