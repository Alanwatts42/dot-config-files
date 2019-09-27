#!/bin/zsh
# Sync files inside a git repository with the same files in $HOME/ dir
# Dotfiles stay in their original locations, but can also sync to the same git repository.

# Cli args: -h for help and -m for commit message
# Great example cli (command line interface) with basic args
usage="$(basename "$0") [-h] [-m "$1"] --a file sync utility that pushes your linux dotfiles to a github repository

where:
    -h show this help text
    -m create commit message (default:'auto-commit by df-sync')"
# continuous "" from `usage="` to `df-sync')"` for multi-line message
message="auto-commit by df-sync"
while getopts ':hm:' option; do
    case "$option" in
        h)  echo "$usage"
            exit
            ;;
        m)  message=$OPTARG
            ;;
        :)  printf "missing arguent for -%s\n" "$OPTARG" >&2
            echo "$usage" >&2
            exit 1
            ;;
        \?) printf "illegal option: -%s\n" "$OPTARG" >&2
            echo "$usage" >&2
            exit 1
            ;;
    esac
done
shift $((OPTIND - 1))
# to use this inside a function:
#  - use "$FUNCNAME" instead of "$(basename '$0')"
#  - add local OPTIND OPTARG before calling `getopts`
# reference(s): 
# <a href="https://stackoverflow.com/questions/5474732/how-can-i-add-a-help-method-to-a-shell-script?answertab=oldest#comment26510679_5476278">
# 1)stackoverflow-main-answer_subj=sh_script_args
# </a>

# switch to $HOME
cd $HOME

# dotfiles
cp $HOME/.vimrc $HOME/vimrc/backups/.vimrc.bak
cp $HOME/.aliases $HOME/vimrc/.aliases.bak
cp $HOME/.bashrc $HOME/vimrc/.bashrc.bak
cp $HOME/.zshrc $HOME/vimrc/.zshrc.bak
cp $HOME/.gitconfig $HOME/vimrc/.gitconfig.bak

# script(s)
cp $HOME/sync.sh $HOME/vimrc/sync.sh.bak
cp $HOME/shinstall.sh $HOME/vimrc/shinstall.sh.bak

# backup complete
echo "files copied to vimrc for backup"

# starting git commit & push
cd $HOME/vimrc
commit_message="$OPTARG" # commit message is $1 first standard input
git add --all
echo "committing changes to repo..."
git commit -m "$commit_message"
if [ $? -eq 0 ]; then
    echo "pushing files to remote..."
    git push
else
    echo "commit fail, trying add, then push..."
    git add --all
    git push
fi

echo "sync completed...  all your files are belong to...  well, you I suppose. Whatever, the point is that it's done, what more do you want from me?"
