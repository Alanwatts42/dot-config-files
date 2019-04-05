""" Evan's Vimrc - 
""" 'Because Vimpin' ain't shit but hoes and tricks'
""" Send complaints to https://github.com/Alanwatts42/Vimrc

""" ===Plugins===

""" Formula to add a plugin = Plug 'reponame' (in single quotes)

""" :PlugInstall - Install the damn things
""" :PlugInstall! - Sometimes you have to yell
""" :PlugUpdate - Expand or die
""" :PlugClean - You don't wanna start getting mold in there

    " Default to same plugin directory as vundle etc
    call plug#begin('~/.vim/bundle')


    " Fuzzy finder (files, mru, etc)
    Plug 'ctrlpvim/ctrlp.vim'

    " Not nearly as exciting or expensive as it sounds
    Plug 'vim-airline/vim-airline'
    
    " Undo history visualizer. Sure, that sounds legit.
    Plug 'mbbill/undotree'

    " Colors - Twinkle twinkle bitches. Charlie Murphy!!
    Plug 'flazz/vim-colorschemes'

    " Tom's still your friend on myspace
    Plug 'tomtom/tcomment_vim'

    " Autoclose (, " etc [with yo lazy ass
    Plug 'somini/vim-autoclose'

    " UNIX shell command helpers, e.g. sudo, chmod, remove etc.
    " tpope is far too gangster to tell you how to use this shit.
    " His README.md be all like "figure it out, stupid"
    Plug 'tpope/vim-eunuch'

    " Git wrapper inside Vim
    " tpope has the death sentence on twelve systems
    Plug 'tpope/vim-fugitive'

    " Handle surround chars like ''
    " He doesn't like you... I don't like you either. 'I'll be careful tpope'
    " I say as I turn back to the bar tender, hoping he'll leave me alone.
    " tpope's eyes widen as his face twists into a mix of murder and amusement
    " He moves his face closer to mine, his eye twitching from years of PTSD
    " and massive drug abuse. 'YOU'll BE DEAD' he yells at me from 1 inch
    " away, his gingivitis breath uncomfortably hot on my face as he reaches
    " for his knife, ready to git commit another murder at a moment's notice
    Plug 'tpope/vim-surround'

    " Align your = etc.
    " Becuase yo crooked ass couldn't draw a straight line 
    " if yo dick was a ruler
    Plug 'junegunn/vim-easy-align'

    " All plugins must be included before next line
    " If yo stupid ass writes 'Plug' anywhere below the next 
    " line, you better not be confused when it doesn't do shit
    call plug#end()

    
syntax enable   " Syntax highlighting on
silent! colorscheme getafe

filetype plugin on      " enables filetype plugins placed in ~/.vim/ftplugin 
                        " directory - i.e. settings for python '*.py' files
                        " can be modified or removed via the 'python.vim' file
                        " in the 'ftplugin' directory. The same applies for
                        " any filetypes that you'd like vim to handle in a 
                        " specific way or with specific settings or formatting
                        " ain't no sense in leaving all kinds of augroups and
                        " complicated indented chunks of code in your .vimrc
                        " file, especially if you want to use mine as a
                        " template.


" ===Vimposing my standards on others because I'm right and they're wrong===
" 
" Listen up all you git clones, and let me git push something on you right
" quick. I'll go on record as saying that any and all complicated chunks 
" of nonsense involved with my vim setup are purposely left OUT of this 
" .vimrc, and for good reason. Vim already BY DEFAULT checks in several
" directories, many of which are already in the .vim anyway, specifically
" FOR those complicated chunks of nonsense that many .vimrc files I have seen 
" are positively INFESTED with. Show me a 40 page .vimrc file and I'll show
" you why you're doing it wrong. If that doesn't work, I'll call my nigga
" tpope and let him stare you down murderously while your vim takes 45 seconds
" to open up a file, which is FAR too long. Vim handles TEXT bro... TEXT  
" should never take longer than like 5 seconds to load up unless it's 
" Microsoft office, and yo broke ass does not look like Bill Gates to me. 


" ===Keybindings & General Doc Settings===
" settings that apply to any vim document

" Use utf-8 encoding
set encoding=utf-8  

" Leader = ','
let g:mapleader=','

" Quickly edit/source .vimrc
noremap <Leader>ve :edit $HOME/.vimrc<CR>
noremap <Leader>vs :source $HOME/.vimrc<CR>

" More normal Clipboard (Vim's default setup is wack yo)
" Yan to clipboard with Yy, <F2> for paste mode (into vim)
noremap <Leader>y "+y
nnoremap <F2> :set invpaste paste?<CR>
set pastetoggle=<F2>
set showmode
set clipboard=unnamed

" Find all and replace
nnoremap <Leader>rc :%s/\<<C-r><C-w>\>/
vnoremap <Leader>rc y:$s/<C-r>"/

" Toggle relativenumber
nnoremap p
<silent> <Leader>r :set relativenumber!<CR>

" set cursorline              " hilight cursor line
set more                                    
set number                  " line numbers
set scrolloff=3             " lines above/below cursor
set showcmd                 " show cmds being typed
set title                   " window title
set vb t_vb=0       " disable beep and flashing

set guioptions-=m       " remove menubar
set guioptions-=T       " remove toolbar
set guioptions-=r       " remove right scrollbar

set hidden                      " buffer change, more undo
set history=1000                " default 20
set laststatus=2                " always show statusline
set linebreak                   " don't cut words on wrap
set listchars=tab:>\            " > to highlight <Tab>
set list                        " displaying listchars
set mouse=a                     " disable mouse
set splitbelow                  " splits go below w/focus
set splitright                  " vsplits go right w/focus
set ttyfast                     " for faster redraws etc

" Bind ctrl+<movement> keys to move around the windows
map <c-j> <c-w>j
map <c-k> <c-w>k
map <c-l> <c-w>l
map <c-h> <c-w>h

" Highlight last inserted text
nnoremap gV '[V']
set ru  " Show cursor position even if inactive
set noeb  " Attempt to silence error dings for console vim
set lazyredraw  " Makes Vim run a bit faster (in theory)
set mouse=a  " Limited mouse functionality
set ww=<,>,h,l  " ww = commands allowed to 'wrap' around EOL

" Easy indent with >> or << with in visual mode
vnoremap < <gv
vnoremap > >gv

""" Search and replace 
set gdefault                " default s//g (global)
set incsearch               " searches as you type
set matchtime=2             " time to blink match {}
set matchpairs+=<:>         " for ci< or ci>
set showmatch               " tmpjump to match-bracket

" Find and replace all 
nnoremap <Leader>rc :%s/\<<C-r><C-w>\>/
vnoremap <Leader>rc y:$s/<C-r>"/

""" Wildmode/wildmenu command-line completion 
set wildignore+=*.bak,*.swp,*.swo
set wildignore+=*.a,*.o,*.so,*.pyc,*.class
set wildignore+=*.jpg,*.jpeg,*.gif,*.png,*.pdf
set wildignore+=*/.git*,*.tar,*.zip
set wildmenu
set wildmode=longest:full,list:full

" Refers to function in .vim/autoload/dysfunctions.vim
" autocmd BufWinEnter * call dysfunctions#IndTxtObj()

" saving/loading
set autoread                    " refresh if changed
set confirm                     " confirm changed files
set noautowrite                 " never autowrite
set nobackup                    " disable backups

""" Persistent undo. Requires Vim 7.3 {{{
if has('persistent_undo') && exists('&undodir')
    set undodir=$HOME/.vim/undo/    " where to store undofiles
    set undofile                " enable undofile
    set undolevels=500          " max undos stored
    set undoreload=10000        " buffer stored undos
endif

""" For options related to Python (PEP 8 formatting, etc)
""" see 'python.vim' file in '.vim/ftplugin' folder

" Bind ctrl+<movement> keys to move around the windows
map <c-j> <c-w>j
map <c-k> <c-w>k
map <c-l> <c-w>l
map <c-h> <c-w>h
" Highlight last inserted text
nnoremap gV '[V']

" Allow multiple >> indent without disrupting visual mode
vnoremap < <gv
vnoremap > >gv

"""Text formatting 
set autoindent                  " preserve indentation
set backspace=indent,eol,start  " normal backspace
set expandtab                   " indents <Tab> as spaces
set ignorecase                  " by default ignore case
set nrformats+=alpha            " incr/decr letters C-a/-x
set shiftround                  " round indent of 'sw'
set shiftwidth=0                " =0 uses 'ts' value
set smarttab                    " tab to 0,4,8 etc.
set softtabstop=-1              " =-1 uses 'sw' value
set tabstop=4                   " <Tab> as 4 spaces


"===============================================================
""" For options related to Python (PEP 8 formatting, etc)
""" see 'python.vim' file in '.vim/ftplugin' folder
"===============================================================


"""===Plugins===
" Settings pertaining only to plugins that require them
""" Plugins related exclusively to Python are also found in
""" '.vim/ftplugin/python.vim'. This is by far a better way
""" including such settings/plugins ONLY for .py files, which
""" saves a lot of wasted resources if everything .py related 
""" were included in .vimfc (like a lot of these hoe ass fools)

" Syntastic - toggle error list. Probably should be toggleable.
noremap <silent><Leader>lo :Errors<CR>
noremap <silent><Leader>lc :lclose<CR>

" Vim-rope - ,j or ,r = define and rename respectively
map <leader>j :RopeGotoDefinition<CR>
map <leader>r :RopeRename<CR>

" Find all and replace
nnoremap <Leader>rc :%s/\<<C-r><C-w>\>/
vnoremap <Leader>rc y:$s/<C-r>"/

" ==gvim==
set guioptions-=m       " remove menubar
set guioptions-=T       " remove toolbar
set guioptions-=r       " remove right scrollbar


" 'Hoes might clone me, but they never own me' -tpope
"
