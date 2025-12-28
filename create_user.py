#!/usr/bin/env python3
"""
Script to create a user in Plane database
Usage: Run this inside the plane-api container
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plane.settings.production')
sys.path.insert(0, '/code')
django.setup()

from django.contrib.auth.hashers import make_password
from plane.db.models import User, Profile

def create_user(email, username, password):
    """Create a user with the given credentials"""
    try:
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            print(f"User with email {email} already exists!")
            return False
        
        if User.objects.filter(username=username).exists():
            print(f"User with username {username} already exists!")
            return False
        
        # Create the user
        user = User.objects.create(
            email=email,
            username=username,
            password=make_password(password),
            is_active=True,
            is_email_verified=True,
            is_password_autoset=False,
            display_name=username,
        )
        
        print(f"✓ User created successfully!")
        print(f"  Email: {user.email}")
        print(f"  Username: {user.username}")
        print(f"  ID: {user.id}")
        
        # Profile is auto-created by signal, but verify
        if hasattr(user, 'profile'):
            print(f"✓ Profile created automatically")
        
        return True
        
    except Exception as e:
        print(f"✗ Error creating user: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    email = "maharajanabishek@gmail.com"
    username = "abishek_m"
    password = "admin"
    
    print(f"Creating user: {username} ({email})")
    print("-" * 50)
    
    success = create_user(email, username, password)
    
    if success:
        print("\n✓ User creation completed successfully!")
        print(f"\nYou can now login at http://localhost:3005 with:")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
    else:
        print("\n✗ User creation failed!")
        sys.exit(1)
