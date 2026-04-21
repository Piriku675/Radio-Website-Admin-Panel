#!/data/data/com.termux/files/usr/bin/bash

# ============================================
#   Interactive GitHub Deploy Tool (Termux)
# ============================================

BRANCH="main"

echo "📁 Project directory:"
pwd

# Ensure git repo
if [ ! -d ".git" ]; then
  echo "⚠️ Not a git repo. Initializing..."
  git init
  git branch -M $BRANCH
fi

# Ask for repo URL if not set
REMOTE_URL=$(git remote get-url origin 2>/dev/null)

if [ -z "$REMOTE_URL" ]; then
  echo "🔗 Enter your GitHub repository URL:"
  read -r REPO_URL

  git remote add origin "$REPO_URL"
else
  echo "🔗 Current remote: $REMOTE_URL"
  echo "Change it? (y/N)"
  read -r CHANGE_REMOTE

  if [[ "$CHANGE_REMOTE" == "y" || "$CHANGE_REMOTE" == "Y" ]]; then
    echo "Paste new repo URL:"
    read -r REPO_URL
    git remote set-url origin "$REPO_URL"
  fi
fi

# Choose action
echo ""
echo "Choose deployment mode:"
echo "1) Normal push (safe)"
echo "2) Force overwrite repo (⚠️ destructive)"
echo "3) Wipe repo history (fresh start)"
read -r MODE

# Commit message
echo "📝 Enter commit message (or press enter for auto):"
read -r USER_MSG

if [ -z "$USER_MSG" ]; then
  COMMIT_MSG="Update: $(date +"%Y-%m-%d %H:%M:%S")"
else
  COMMIT_MSG="$USER_MSG"
fi

# Execute modes
case $MODE in
  1)
    echo "🔄 Normal push..."
    git pull origin "$BRANCH" --rebase
    git add .
    git commit -m "$COMMIT_MSG" || echo "⚠️ Nothing to commit"
    git push origin "$BRANCH"
    ;;
    
  2)
    echo "⚠️ FORCE PUSH WILL OVERWRITE REMOTE HISTORY"
    echo "Type YES to continue:"
    read -r CONFIRM

    if [ "$CONFIRM" == "YES" ]; then
      git add .
      git commit -m "$COMMIT_MSG" || echo "⚠️ Nothing to commit"
      git push origin "$BRANCH" --force
    else
      echo "❌ Cancelled"
    fi
    ;;

  3)
    echo "💣 This will DELETE ALL GIT HISTORY"
    echo "Type DELETE to continue:"
    read -r CONFIRM

    if [ "$CONFIRM" == "DELETE" ]; then
      rm -rf .git
      git init
      git branch -M $BRANCH
      git remote add origin "$REPO_URL"

      git add .
      git commit -m "Fresh start"
      git push -u origin "$BRANCH" --force
    else
      echo "❌ Cancelled"
    fi
    ;;

  *)
    echo "❌ Invalid option"
    ;;
esac

echo "✅ Done"
