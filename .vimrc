""" Evan's .vimrc
""" 
""" The following is cobbled together from several other .vimrc 
""" examples. No one comes up with anything independently.
""" Every 'new' idea is really a composite of various others.
""" Creativity is the ability to make the compositing process
""" invisible, or at the very least difficult to trace.

""" Anyone is welcome to steal anything you want that you can
""" you can find up here. If I didn't want it stolen, I 
""" shouldn't have put it up here where everyone could see it.

""" Take what you want, give nothing back. Happy pirating lads.


""" ===Plugins===

""" Formula to add a plugin = Plug 'reponame' (in single quotes)

""" :PlugInstall - Install the damn things
""" :PlugInstall! - Sometimes you have to yell
""" :PlugUpdate - Expand or die
""" :PlugClean - You don't wanna start getting mold in there

" Points to the dir where plugins managed by the plugin handler are kept.
" By default should be $HOME/.vim/bundle

call plug#begin('~/.vim/bundle')

Plug 'ctrlpvim/ctrlp.vim'  " Fuzzy finder (files, mru, etc)
Plug 'vim-syntastic/syntastic' " A linter, many options, much correct.
Plug 'klen/rope-vim' " Use <leader>+j for docs lookup on selected code
Plugin 'tpope/vim-surround'  " easy manipulation of surround chars
Plug 'vim-airline/vim-airline' " operative word 'line'
Plug 'mbbill/undotree' " Undo history tool 
Plug 'flazz/vim-colorschemes' " change colorshemes easier
Plug 'tomtom/tcomment_vim' " use gcc to comment/uncomment text under cursor
Plug 'tpope/vim-commentary'  " tpope doesn't write docs, docs write themselves out of fear.
" Auto-close when using grouping symbols i.e.'(), [], {}, '', ' 
Plug 'somini/vim-autoclose'

" UNIX shell command helpers, e.g. sudo, chmod, remove etc.
" tpope is far too gangster to tell you how to use this shit.
" His README.md be all like 'figure it out, stupid'
Plug 'tpope/vim-eunuch'

" Git wrapper inside Vim
" tpope has the death sentence on twelve systems
Plug 'tpope/vim-fugitive'


call plug#end()

" ==Useful General Settings==

" Settings that will apply to all filetypes. Any filetype-specific
" configurations (*.vim files inside the .vim/ftplugin directory)
" would have these settings as a foundation, and there shouldn't be
" many filetypes (if any) that require any of these to be turned off

" Use utf-8 encoding 
set encoding=utf-8  


" -Keyboard-Cartography-

" <leader> key mapping. I typically use comma or ',' 
let g:mapleader=','  

" Quickly edit/source .vimrc 
noremap <Leader>ve :edit $HOME/.vimrc<CR> 
noremap <Leader>vs :source $HOME/.vimrc<CR>  

" Easy indent with >> or << with in visual mode 
vnoremap < <gv 
vnoremap > >gv


" Fixing Vim's clipboard (as much as possible)
noremap <Leader>y "+y 
nnoremap <F2> :set invpaste paste?<CR> 
set pastetoggle=<F2> 
set showmode 
set clipboard=unnamed 
" About clipboard modifications:
" <leader>y or 'leader+y' should copy to system clipboard
" <F2> toggles 'paste mode', helps paste into vim
" Procedure for this: <F2>, <insert mode>, <paste>, <F2> again for paste mode off.
" 'showmode' tells vim to display status of  'paste mode' (on or off)
" 'set clipboard=unnamed', not sure what this does exactly, but also helps fix vim's clipboard.

" Find and Replace all 
nnoremap <Leader>rc :%s/\<<C-r><C-w>\>/ 
vnoremap <Leader>rc y:$s/<C-r>"/  

""" Search and replace 
set gdefault                " default s//g (global) 
set incsearch               " searches as you type 
set matchtime=2             " time to blink match {} 
set matchpairs+=<:>         " for ci< or ci> 
set showmatch               " tmpjump to match-bracket

" Toggle relativenumber 
nnoremap <Leader>r :
set relativenumber!<CR>

" --Screen-Splitting--
" :sp <path to file you want to split screen with (vertically)

" I forgot how to do it horizontally but it'd be identical to 
" the way you do it vertically, but with something other than :sp

" Bind ctrl+<movement> keys to move around the windows 
map <c-j> <c-w>j 
map <c-k> <c-w>k 
map <c-l> <c-w>l 
map <c-h> <c-w>h

" Handle Vim-rope - ,j or ,r = define and rename respectively
map <leader>j :RopeGotoDefinition<CR>
map <leader>r :RopeRename<CR>

" ==gvim options==
set guioptions-=m       " remove menubar
set guioptions-=T       " remove toolbar
set guioptions-=r       " remove right scrollbar

" -Indent, Type-Setting Options-
set hidden                      " buffer change, more undo 
set history=1000                " default 20 
set laststatus=2                " always show statusline 
set linebreak                   " don't cut words on wrap 
set listchars=tab:>\            " > to highlight <Tab> 
set list                        " displaying listchars 
set splitbelow                  " splits go below w/focus 
set splitright                  " vsplits go right w/focus 
set ttyfast                     " for faster redraws etc

" Highlight last inserted text 
nnoremap gV '[V'] 

" -Mouse & Cursor-
set ru  " Show cursor position even if inactive 
set noeb  " Attempt to silence error dings for console vim 
set lazyredraw  " Makes Vim run a bit faster (in theory) 
set mouse=a  " Limited mouse functionality 
set ww=<,>,h,l  " ww = commands allowed to 'wrap' around EOL

""" Wildmode/wildmenu command-line completion 
set wildignore+=*.bak,*.swp,*.swo 
set wildignore+=*.a,*.o,*.so,*.pyc,*.class 
set wildignore+=*.jpg,*.jpeg,*.gif,*.png,*.pdf 
set wildignore+=*/.git*,*.tar,*.zip 
set wildmenu 
set wildmode=longest:full,list:full

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

"""Text formatting set autoindent                  " preserve indentation 
set backspace=indent,eol,start  " normal backspace 
set expandtab                   " indents <Tab> as spaces 
set ignorecase                  " by default ignore case 
set nrformats+=alpha            " incr/decr letters C-a/-x 
set shiftround                  " round indent of 'sw' 
set shiftwidth=0                " =0 uses 'ts' value 
set smarttab                    " tab to 0,4,8 etc. 
set softtabstop=-1              " =-1 uses 'sw' value 
set tabstop=4                   " <Tab> as 4 spaces


""" ===Plugin Settings===
 

" -Syntastic-
noremap <silent><Leader>le :Errors<CR>  " show list of errors
noremap <silent><Leader>lc :lclose<CR>  " close error list

" -Vim-rope-
map <leader>j :RopeGotoDefinition<CR>
map <leader>r :RopeRename<CR>

" format for new plugin settings:
" -name of plugin- 
" setting1 
" setting2

" -next plugin-
" etc.






