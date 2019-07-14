# Bash aliases - examples found in /usr/share/doc/bash-doc/examples

# Functions - similar to aliases, but can have things like parameters/variables

# Example function - "apt-grab <program> = "sudo apt-get -f install <program> --install-suggests"
apt-grab(){
    "sudo apt-get install ${1} --install-suggests"
}

wifi-func(){
    "sudo nmcli dev wifi connect ${1} password ${2}"
}

# Apt or apt-get shortcuts for convenience
alias aptg-up="sudo apt-get update && sudo apt-get dist-upgrade"
alias aptg="sudo apt-get"
alias aptg-in="sudo apt-get install"
alias apt-up="sudo apt update && sudo apt upgrade"
alias apt-in="sudo apt install"
alias aptsearch="sudo apt search"


# Wifi operations via the terminal - very long, very specific, aliases therefore very necessary
alias wifi-go="sudo nmcli dev wifi connect"
alias mifi-go="sudo nmcli dev wifi connect MY_EX-WIFI_GOT_THE_HOUSE password amqv294#"
alias wifi-scan="sudo nmcli dev wifi"

# Pip, pipenv, and python
alias py="python3 -m"
alias pp2in="pip install --user"
alias ppin="pip3 install --user"
alias ppvg="pipenv graph"
alias ppvin="pipenv install"
alias ppvcheck="pipenv check"
alias ppvsync="pipenv sync"
alias ppvupdate="pipenv update"
alias ppvshell="pipenv shell"

# --Git--
# start a working area
alias ginit="git init"
alias gclone="git clone"
# work on the current change
alias gadd="git add"
alias gmv="git mv"
alias greset="git reset"
alias grm="git rm"
# examine the history and state (see also: git help revisions)
alias gbisect="git bisect"
alias ggrep="git grep"
alias glog="git log"
alias gshow="git show"
alias gs="git status"
# grow, mark and tweak your common history
alias gbranch="git branch"
alias gcheckout="git checkout"
alias gdiff="git diff"
alias gcommit="git commit"
alias gmerge="git merge"
alias grebase="git rebase"
alias gtag="git tag"
# collaborate (see also: git help workflows)
alias gfetch="git fetch"
alias gpush="git push"
alias gpull="git pull"

# Emulation & Games - Last but not least
alias vidgames="emulationstation"

# Python
alias python="python3"
alias py="python3"