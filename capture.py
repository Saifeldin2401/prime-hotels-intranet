import re
from playwright.sync_api import sync_playwright
import time
import sys

def main():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            
            print("Navigating to http://localhost:5173")
            page.goto('http://localhost:5173')
            page.wait_for_load_state('networkidle')
            
            # 1. Login
            page.screenshot(path=r'c:\Users\mahro\.gemini\antigravity\brain\ef9777bd-64a8-40fb-996c-fbc62b57ca74\1_login.png', full_page=True)
            print("Screenshot 1: Login")
            
            print("Filling login info")
            page.fill('input[type="email"]', 'admin@prime.com')
            page.fill('input[type="password"]', 'Reem@1977')
            
            # Wait a tick for react state
            time.sleep(1)
            page.locator('button[type="submit"]').click()
            
            # Wait for dashboard
            page.wait_for_load_state('networkidle')
            time.sleep(2)
            
            # 2. Dashboard
            page.screenshot(path=r'c:\Users\mahro\.gemini\antigravity\brain\ef9777bd-64a8-40fb-996c-fbc62b57ca74\2_dashboard.png', full_page=True)
            print("Screenshot 2: Dashboard")
            
            # 3. Knowledge Base
            # Try to click the link that says Knowledge Base or has href /knowledge-base
            print("Navigating to Knowledge Base")
            try:
                page.locator('a[href="/knowledge-base"]').first.click()
            except:
                print("Could not find direct link, opening by URL")
                page.goto('http://localhost:5173/knowledge-base')
                
            page.wait_for_load_state('networkidle')
            time.sleep(2)
            page.screenshot(path=r'c:\Users\mahro\.gemini\antigravity\brain\ef9777bd-64a8-40fb-996c-fbc62b57ca74\3_knowledge_base.png', full_page=True)
            print("Screenshot 3: Knowledge Base")
            
            # 4. KB Article
            print("Opening a KB article")
            try:
                # Find the first article link
                page.locator('a[href^="/knowledge-base/"]').first.click(timeout=3000)
                page.wait_for_load_state('networkidle')
                time.sleep(2)
                page.screenshot(path=r'c:\Users\mahro\.gemini\antigravity\brain\ef9777bd-64a8-40fb-996c-fbc62b57ca74\4_article.png', full_page=True)
            except:
                print("Could not click an article.")
            
            # 5. My Learning / Trainings
            print("Navigating to My Learning")
            try:
                page.locator('a[href="/training"]').first.click()
            except:
                print("Could not find direct link, opening by URL")
                page.goto('http://localhost:5173/training')
                
            page.wait_for_load_state('networkidle')
            time.sleep(2)
            page.screenshot(path=r'c:\Users\mahro\.gemini\antigravity\brain\ef9777bd-64a8-40fb-996c-fbc62b57ca74\5_my_learning.png', full_page=True)
            print("Screenshot 5: My Learning")
            
            # 6. Training Module
            print("Opening a training module")
            try:
                page.locator('a[href^="/training/modules/"]').first.click(timeout=3000)
                page.wait_for_load_state('networkidle')
                time.sleep(2)
                page.screenshot(path=r'c:\Users\mahro\.gemini\antigravity\brain\ef9777bd-64a8-40fb-996c-fbc62b57ca74\6_module.png', full_page=True)
            except:
                print("Could not click a module.")
            
            browser.close()
            print("Done")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
