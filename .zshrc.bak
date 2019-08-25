# Prompt setup >>

autoload -Uz promptinit
promptinit
prompt adam1


# Environment variables >>
export ZSH_CUSTOM="~/zsh_custom"


# Options >>
setopt histignorealldups sharehistory
setopt AUTO_CD

# Vim as EDITOR to allow vi style controls
EDITOR=vim

# Keep 1000 lines of history within the shell and save it to ~/.zsh_history:
HISTSIZE=1000
SAVEHIST=1000
HISTFILE=~/.zsh_history

# Use modern completion system
autoload -Uz compinit
compinit


# Ls colors >>
d="~/.dircolors"
test -r $d && eval "$(dircolors $d)"


# Text style >>
zstyle ':completion:*' auto-description 'specify: %d'
zstyle ':completion:*' completer _expand _complete _correct _approximate
zstyle ':completion:*' format 'Completing %d'
zstyle ':completion:*' group-name ''
zstyle ':completion:*' menu select=2
eval "$(dircolors -b)"
zstyle ':completion:*:default' list-colors ${(s.:.)LS_COLORS}
zstyle ':completion:*' list-colors ''
zstyle ':completion:*' list-prompt %SAt %p: Hit TAB for more, or the character to insert%s
zstyle ':completion:*' matcher-list '' 'm:{a-z}={A-Z}' 'm:{a-zA-Z}={A-Za-z}' 'r:|[._-]=* r:|=* l:|=*'
zstyle ':completion:*' menu select=long
zstyle ':completion:*' select-prompt %SScrolling active: current selection at %p%s
zstyle ':completion:*' use-compctl false
zstyle ':completion:*' verbose true
zstyle ':completion:*:*:kill:*:processes' list-colors '=(#b) #([0-9]#)*=0=01;31'
zstyle ':completion:*:kill:*' command 'ps -u $USER -o pid,%cpu,tty,cputime,cmd'


# Zplug settings >>

# Zplug auto-install check
if [[ ! -d ~/.zplug ]];then
  git clone https://github.com/zplug/zplug ~/.zplug 
  source ~/.zplug/init.zsh && zplug update --self
fi

# Essential for zplug to work
source ~/.zplug/init.zsh

# Zsh history search
zplug "zsh-users/zsh-history-substring-search"
# Zsh syntax highlighting
zplug "zsh-users/zsh-syntax-highlighting", defer:2
# Zsh-autosuggestions 
zplug "zsh-users/zsh-autosuggestions"

# Theme
zplug "romkatv/powerlevel10k", from:oh-my-zsh, as:theme

# Install packages that have not been installed yet
if ! zplug check --verbose; then
    printf "Install? [y/N]: "
    if read -q; then
        echo; zplug install
    else
        echo
    fi
fi

zplug load


# Sources >>
source ~/.aliases
source ~/powerlevel10k/powerlevel10k.zsh-theme
# source ~/.purepower

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ -f ~/.p10k.zsh ]] && source ~/.p10k.zsh
