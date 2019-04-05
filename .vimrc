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

    Plug ''
    " Undo history visualizer
    Plug 'mbbill/undotree'

    " Colors - You gots to come correct son
    Plug 'flazz/vim-colorschemes'

    " Tom's still your friend on myspace
    Plug 'tomtom/tcomment_vim'

    " Autoclose (, " etc with yo lazy ass
    Plug 'somini/vim-autoclose'

    " UNIX shell command helpers, e.g. sudo, chmod, remove etc.
    " tpope is far too gangster to tell you how to use his shit
    " you either know it or you dumb
    Plug 'tpope/vim-eunuch'

    " Git wrapper inside Vim
    " tpope has the death sentence on twelve systems
    Plug 'tpope/vim-fugitive'

    " Handle surround chars like ''
    " He doesn't like you... I don't like you either
    Plug 'tpope/vim-surround'

    " Align your = etc.
    " Becuase yo crooked ass couldn't draw a straight line to save yo mama's life
    Plug 'junegunn/vim-easy-align'

    " All plugins must be included before next line
    " If yo stupid ass writes 'Plug' anywhere below the next 
    " line, you better not be confused when it doesn't do shit
    call plug#end()
""" }}}
""" Local leading config, only for prerequisites and will be overwritten {{{

        syntax enable
        silent! colorscheme getafe
        """ Force behavior and filetypes, and by extension highlighting {{{
    """ Interface
        set cursorline              " hilight cursor line
        set more                                    
        set number                  " line numbers
        set scrolloff=3             " lines above/below cursor
        set showcmd                 " show cmds being typed
        set title                   " window title
        set vb t_vb=0       " disable beep and flashing
""" Depending on your setup you may want to enforce UTF-8. {{{
""" Should generally be set in your environment
"""LOCALE/$LANG
            set encoding=utf-8      " default $LANG/latin1
            set fileencoding=utf-8
""" Gvim {{{
            set guifont=DejaVu\ Sans\ Mono\ 9
            set guioptions-=m       " remove menubar
            set guioptions-=T       " remove toolbar
            set guioptions-=r       " remove right scrollbar
        """ }}}
    """ }}}
""" }}}
""" General settings {{{
    " set completeopt=menu            " insert mode completion
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
    """ }}}
    """ Search and replace {{{
        set gdefault                " default s//g (global)
        set incsearch               " searches as you type
    """ }}}
    """ Matching {{{
        set matchtime=2             " time to blink match {}
        set matchpairs+=<:>         " for ci< or ci>
        set showmatch               " tmpjump to match-bracket
    """ }}}
    """ Wildmode/wildmenu command-line completion {{{
        set wildignore+=*.bak,*.swp,*.swo
        set wildignore+=*.a,*.o,*.so,*.pyc,*.class
        set wildignore+=*.jpg,*.jpeg,*.gif,*.png,*.pdf
        set wildignore+=*/.git*,*.tar,*.zip
        set wildmenu
        set wildmode=longest:full,list:full
    """ }}}
    """ Return to last edit position when opening files {{{
        augroup LastPosition
            autocmd! BufReadPost *
                \ if line("'\"") > 0 && line("'\"") <= line("$") |
                \     exe "normal! g`\"" |
                \ endif
        augroup END
    """ }}}
""" }}}
""" Files {{{
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
    """ }}}
    """ Swap files, unless vim is invoked using sudo {{{
    """ https://github.com/tejr/dotfiles/blob/master/vim/vimrc
        if !strlen($SUDO_USER)
            set directory^=$HOME/.vim/swap//    " default cwd, // full path
            set swapfile            " enable swap files
            set updatecount=50      " update swp after 50chars
            """ Don't swap tmp, mount or network dirs {{{
                augroup SwapIgnore
                    autocmd! BufNewFile,BufReadPre /tmp/*,/mnt/*,/media/* setlocal noswapfile
                augroup END
            """ }}}
        else
            set noswapfile          " dont swap sudo'ed files
        endif
    """ }}}
""" }}}
""" Text formatting {{{
    set autoindent                  " preserve indentation
    set backspace=indent,eol,start  " normal backspace
    set expandtab                   " indents <Tab> as spaces
    set ignorecase                  " by default ignore case
    set nrformats+=alpha            " incr/decr letters C-a/-x
    set shiftround                  " round indent of 'sw'
    set shiftwidth=0                " =0 uses 'ts' value
    set smartcase                   "sensitive with uppercase
    set smarttab                    " tab to 0,4,8 etc.
    set softtabstop=-1              " =-1 uses 'sw' value
    set tabstop=4                   " <Tab> as 4 spaces
        
        " Remap <Leader>
        let g:mapleader=','

        " Quickly edit/source .vimrc
        noremap <Leader>ve :edit $HOME/.vimrc<CR>
        noremap <Leader>vs :source $HOME/.vimrc<CR>

        " Yank(copy) to system clipboard
        noremap <Leader>y "+y

        " Toggle pastemode, doesn't indent
        set pastetoggle=<F2>


        " Find & Replace all
        nnoremap <Leader>rc :%s/\<<C-r><C-w>\>/
        vnoremap <Leader>rc y:$s/<C-r>"/

        " Toggle relativenumber
        nnoremap <silent> <Leader>r :set relativenumber!<CR>

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

        " Syntastic - toggle error list. Probably should be toggleable.
        noremap <silent><Leader>lo :Errors<CR>
        noremap <silent><Leader>lc :lclose<CR>

        " Vim-rope - ,j or ,r = define and rename respectively
        map <leader>j :RopeGotoDefinition<CR>
        map <leader>r :RopeRename<CR>

" Find all and replace
nnoremap <Leader>rc :%s/\<<C-r><C-w>\>/
vnoremap <Leader>rc y:$s/<C-r>"/


