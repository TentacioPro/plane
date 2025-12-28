#!/usr/bin/env python3
"""
Script to mark Plane instance as setup complete
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plane.settings.production')
sys.path.insert(0, '/code')
django.setup()

from plane.license.models import Instance

try:
    instance = Instance.objects.last()
    if instance:
        instance.is_setup_done = True
        instance.is_signup_screen_visited = True
        instance.save()
        print(f"✓ Instance setup marked as complete!")
        print(f"  Instance ID: {instance.instance_id}")
        print(f"  Setup done: {instance.is_setup_done}")
        print(f"  Signup visited: {instance.is_signup_screen_visited}")
    else:
        print("✗ No instance found!")
        sys.exit(1)
except Exception as e:
    print(f"✗ Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
