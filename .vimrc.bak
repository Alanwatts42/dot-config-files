""" Evan's .vimrc

set nocompatible    " not compatible with vi, required for certain options

augroup myvimrc
    au!
    au BufWritePost .vimrc,_vimrc,vimrc,.gvimrc,_gvimrc,gvimrc so $MYVIMRC| if has('gui_running') | so $MYGVIMRC | endif
augroup END

" Allows the same .vimrc file to be used on both Windows and Linux (WSL) 
" defines variable called home, varies based on OS directory system 
if has("win32")
  let dotvim = 'C:\Users\evan\vimfiles\'
else
  let dotvim = "~/.vim/"
endif
 
let bundle = dotvim."bundle"
let autoload = dotvim."autoload"

" Install vim-plug on first time opening vim with this .vimrc.
" Also re-installs vim-plug if missing for whatever reason.
if has("win32")
	if empty(autoload)
		md \vimfiles\autoload
		$uri = 'https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim'
		(New-Object Net.WebClient).DownloadFile(
			$uri,
			$ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath(	"~\vimfiles\autoload\plug.vim"
			)
		)
	endif
else
  if empty(autoload)
    silent !curl -fLo plug --create-dirs \ https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
    autocmd VimEnter * PlugInstall --sync | source $MYVIMRC
  endif
endif

" tmux color issue fix
if &term =~# '256color' && ( &term =~# '^screen'  || &term =~# '^tmux'  )
    let &t_8f = "\<Esc>[38;2;%lu;%lu;%lum"
    let &t_8b = "\<Esc>[48;2;%lu;%lu;%lum"
    set termguicolors
endif
" <https://vi.stackexchange.com/questions/10708/no-syntax-highlighting-in-tmux>

""" === Plugins ===
""" Formula to add a plugin = Plug 'foo/bar' (in single quotes)
""" :PlugInstall - Install the damn things
""" :PlugInstall! - Sometimes you have to yell
""" :PlugUpdate - Expand or die
""" :PlugClean - You don't wanna start getting mold in there

" Points to the dir where plugins managed by the plugin handler are kept.
" By default should be $HOME/.vim/bundle

call plug#begin(bundle)

""" == Development Environment and Enhancements ==
Plug 'python-rope/ropevim'  " Updated version of 'rope-vim' py docs lookup
Plug 'tpope/vim-surround'  " easy manipulation of surround chars
Plug 'tomtom/tcomment_vim' " use gcc to comment/uncomment text under cursor
Plug 'tpope/vim-commentary'  " tpope doesn't write docs, docs write themselves out of fear.
Plug 'somini/vim-autoclose' " Auto-close when using grouping symbols i.e.'(), [], {}, '', '
Plug 'FooSoft/vim-argwrap'  " Rearrange args within () using <leader><a>
Plug 'PyCQA/pylint'         " Python linter

""" == Javascript ==
Plug 'w0rp/ale'    " javascript linter
Plug 'prettier/vim-prettier', { 'do': 'npm install' } " see https://github.com/prettier/vim-prettier 

""" == General Functionality ==
Plug 'ctrlpvim/ctrlp.vim'  " Fuzzy finder (files, mru, etc)
Plug 'mbbill/undotree'  " Undo history tool
Plug 'scrooloose/nerdtree'  " manage files and navigate dirs within vim 

""" == Look & Feel ==
Plug 'flazz/vim-colorschemes' " change colorshemes easier
Plug 'vim-airline/vim-airline' " operative word 'line'
Plug 'vim-airline/vim-airline-themes'  " Enables themes for vim-airline
Plug 'christophermca/meta5'  " meta5 colorscheme
Plug 'rafi/awesome-vim-colorschemes'
Plug 'Lokaltog/powerline' " tabline tool

""" == Git and Version Control ==
Plug 'tpope/vim-fugitive' " git wrapper - 'git commit'=':Gcommit'
Plug 'tpope/vim-rhubarb' " something to do with git, I honestly forgot
Plug 'junegunn/gv.vim' " diff tool - requires vim-fugitive to run
Plug 'sodapopcan/vim-twiggy' " branch manager for git repositories
Plug 'airblade/vim-gitgutter'  " excellent document diff tool
Plug 'christoomey/vim-conflicted' " tool for merge & rebase conflicts

""" == Snippets ==
Plug 'garbas/vim-snipmate'                " Snippets manager
Plug 'MarcWeber/vim-addon-mw-utils'       " dependencies #1
Plug 'tomtom/tlib_vim'                    " dependencies #2
Plug 'honza/vim-snippets'                 " snippets repo

""" == Markup/Markdown ==
Plug 'mitsuhiko/vim-sparkup'        " Sparkup(XML/jinja/htlm-django/etc.) 
Plug 'Rykka/riv.vim'                " ReStructuredText plugin
Plug 'plasticboy/vim-markdown' " markdown handling in vim 
Plug 'godlygeek/tabular' " vim-markdown needs this to run

""" == Python ==
Plug 'python-mode/python-mode', { 'for': 'python3', 'branch': 'develop' }
Plug 'scrooloose/syntastic'        " Syntax checking plugin for Vim
Plug 'fisadev/FixedTaskList.vim'   " pending tasks list
Plug 'rosenfeld/conque-term'       " run buffers in sub-shells
Plug 'majutsushi/tagbar'    " depends='apt install exuberant-ctags'

" == C Programming/Dev Support ==
Plug 'WolfgangMehner/vim-plugins'  " C-support, matlab, perl, etc.
Plug 'WolfgangMehner/c-support'  " Tools for C coding
Plug 'OmniSharp/omnisharp-vim' " Adds C# IDE features to Vim

" ==Temporarily-offline=
" Plug 'powerman/vim-plugin-viewdoc'  " MANPAGER = vim
" Plug 'Valloric/YouCompleteMe'     " Complicated linter
" Plug 'tpope/vim-commentary'        " Comment stuff out
" Plug 'plytophogy/vim-virtualenv'    " required for vim-pipenv
" Plug 'PieterjanMontens/vim-pipenv'  " integrates vim/pipenv
" Plug 'jalvesaq/vimcmdline'  " run code on external terminal
" Plug 'tpope/vim-eunuch' " UNIX shell command helpers, e.g. sudo, chmod, remove etc.

call plug#end() " automatically executes: 'filetype plugin indent on'  and 'syntax enable'

filetype plugin indent on     " filetype plugins on
syntax enable       " syntax highlighting on

""" == Colorscheme ==
" main colorscheme
set t_co=256
colorscheme meta5

" --vim-airline theme--
let g:airline_theme='lucius'

" == C-tools ==
let g:C_UseTool_cmake   = 'yes'
let g:C_UseTool_doxygen = 'yes'

" == Ulti-snips ==
" Trigger configuration. Do not use <tab> if you use https://github.com/Valloric/YouCompleteMe.
let g:UltiSnipsExpandTrigger="<tab>"
let g:UltiSnipsJumpForwardTrigger="<c-b>"
let g:UltiSnipsJumpBackwardTrigger="<c-z>"

" If you want :UltiSnipsEdit to split your window.
let g:UltiSnipsEditSplit="vertical"

" == Asynccomplete ==
inoremap <expr> <Tab>   pumvisible() ? "\<C-n>" : "\<Tab>"
inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"
inoremap <expr> <cr>    pumvisible() ? "\<C-y>" : "\<cr>"

" -Force refresh completion-
imap <c-space> <Plug>(asyncomplete_force_refresh)
" -Alternate auto-popup config-
let g:asyncomplete_auto_popup = 0

function! s:check_back_space() abort
    let col = col('.') - 1
    return !col || getline('.')[col - 1]  =~ '\s'
endfunction

inoremap <silent><expr> <TAB>
  \ pumvisible() ? "\<C-n>" :
  \ <SID>check_back_space() ? "\<TAB>" :
  \ asyncomplete#force_refresh()
inoremap <expr><S-TAB> pumvisible() ? "\<C-p>" : "\<C-h>"

" -Language Server Protocol-
if executable('pyls')
    " pip install python-language-server
    au User lsp_setup call lsp#register_server({
        \ 'name': 'pyls',
        \ 'cmd': {server_info->['pyls']},
        \ 'whitelist': ['python'],
        \ })
endif

" ==Python Plugin Options==
" Run python code in current file with F9
nnoremap <F9> :w<cr>:!python %<cr>

" -Pipenv-Integration-
" let pipenv_venv_path = system('pipenv --venv')

" -Python-mode-
" set syntastic to log the output of the linter to vim messages (accessible
" with :mes
" let g:syntastic_debug = 3


" ==Javascript==
autocmd BufWritePre *.js :normal gggqG

" set nodejs config file '~/.npmrc' to *.ini filetype
autocmd BufRead,BufNewFile ~/.npmrc setf dosini 

" ==Templates==
" Shell Scripts '*.sh' files
" Python files '*.py' files
if has("autocmd")
  augroup templates
    autocmd BufNewFile *.sh 0r ~/.vim/templates/skeleton.sh
    autocmd BufNewFile *.py 0r ~/.vim/templates/skeleton.py
  augroup END
endif

" fix for ale disappearing cursor issue on lines where error was found
let g:ale_echo_cursor = 0

" ===========================
" ==Useful General Settings==
" ===========================
" Settings that will apply to all filetypes. Any filetype-specific
" configurations (*.vim files inside the .vim/ftplugin directory)
" would have these settings as a foundation, and there shouldn't be
" many filetypes (if any) that require any of these to be turned off

set title               " window title
set vb t_vb=            " disable beep and flashing
set showcmd             " show cmds being typed
set number              " IDE style line numbering
set ruler               " related to line numbering
set sc                  " Display incomplete commands
set matchtime=2         " time to blink match {}
set matchpairs+=<:>     " for ci< or ci>
set showmatch           " Auto-complete for brackets () [] {}
set wildignore+=*.bak,*.swp,*.swo
set wildignore+=*.a,*.o,*.so,*.pyc,*.class
set wildignore+=*.jpg,*.jpeg,*.gif,*.png,*.pdf
set wildignore+=*/.git*,*.tar,*.zip
set wildmenu
set wildmode=longest:full,list:full
set autoread            " refresh if changed
set confirm             " confirm changed files
set noautowrite         " never autowrite
set linebreak           " don't cut words on wrap
set list                " displaying listchars
set mouse=a             " disable mouse

" Use utf-8 encoding
set encoding=utf-8
set number


" ----------------------
" -Keyboard-Cartography-
" ----------------------

" <leader> key mapping. I typically use comma or ','
let g:mapleader=','

" Quickly edit/source .vimrc
noremap <Leader>ve :edit $HOME/.vimrc<CR>
noremap <Leader>vs :source $HOME/.vimrc<CR>


""" --Clipboard--

" Fixing Vim's clipboard (as much as possible)
" X11 keyboard fix - <Leader>y, p, Y, P = copy, paste to/from X11 clipboard
" Same modification should also work the same way on Win32/MacOS
" src='https://vi.stackexchange.com/questions/84/how-can-i-copy-text-to-the-system-clipboard-from-vim'
nnoremap <Leader>y "*y
nnoremap <Leader>p "*p
nnoremap <Leader>Y "+y
nnoremap <Leader>P "+p

" Y (capital) now yanks from cursor position to end of current line 
noremap Y y$
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

" Delete without copying what is being deleted to clipboard
nnoremap <leader>d "_d
xnoremap <leader>d "_d
xnoremap <leader>p "_dP


""" --Search Options--
set incsearch               " searches as you type
set matchtime=2             " time to blink match {}
set matchpairs+=<:>         " for ci< or ci>
set showmatch               " tmpjump to match-bracket

" Find and replace all
nnoremap <Leader>rc :%s/\<<C-r><C-w>\>/
vnoremap <Leader>rc y:$s/<C-r>"/

" Toggle relativenumber
nnoremap <Leader>rnn :set relativenumber!<CR>


" --Screen-Splitting--
" :sp <path to file you want to split screen with (vertically)
" i.e. :sp ~/.vimrc to split the screen with the .vimrc

" Split Direction
set splitbelow                  " splits go below w/focus
set splitright                  " vsplits go right w/focus

" Split Navigation - Moving between splits (windows)
map <c-j> <c-w>j
map <c-k> <c-w>k
map <c-l> <c-w>l
map <c-h> <c-w>h


"" --Indent, Type-Setting Options--

" <ctrl-e> jumps to the end of the line in insert mode
inoremap <C-e> <C-o>$

" Misc lines and splits
set laststatus=2                " always show statusline
set linebreak                   " don't cut words on wrap
set listchars=tab:>\            " > to highlight <Tab>
set nolist                      " displaying listchars
set ww=<,>,h,l  " ww = commands allowed to 'wrap' around EOL

" --Text-folding setting--
set foldmethod=marker
set foldopen=hor

" Sounds & Other Peripheral Functions
set noeb  " Attempt to silence error dings for console vim
set ttyfast  " for faster redraws etc

" Easy indent with >> or << with in visual mode
vnoremap < <gv
vnoremap > >gv

" Highlight last inserted text
nnoremap gV '[V']

" Mouse/Cursor (or lack thereof)
set ru  " Show cursor position even if inactive
set lazyredraw  " Makes Vim run a bit faster (in theory)
set mouse=a  " Limited mouse functionality

"" Wildmode/wildmenu command-line completion
set wildignore+=*.bak,*.swp,*.swo
set wildignore+=*.a,*.o,*.so,*.pyc,*.class
set wildignore+=*.jpg,*.jpeg,*.gif,*.png,*.pdf
set wildignore+=*/.git*,*.tar,*.zip
set wildmenu
set wildmode=longest:full,list:full

" --saving/loading--
set autoread                    " refresh if changed
set confirm                     " confirm changed files
set noautowrite                 " never autowrite
set nobackup                    " disable backups
set nowritebackup               " no backup while editing
set noswapfile                  " no swap files 

" Markdown auto-format text as ```code snippet``` using tpope/surround 
autocmd FileType md let b:surround_45 = "``` \r ```"
" to surround with ```  ``` in a markdown file, use cmd='yss-'
" 'b:surround_45' was used becuase ascii code for '-' is '45' other
" ascii codes can be cound with ':echo char2nr("%c")' in vim

""" Persistent undo. Requires Vim 7.3 {{{
if has('persistent_undo') && exists('&undodir')
    set undodir=$HOME/.vim/undo/    " where to store undofiles
    set undofile                " enable undofile
    set undolevels=500          " max undos stored
    set undoreload=10000        " buffer stored undos
endif

" --Undo History--
set hidden                      " buffer change, more undo
set history=1000                " default 20

""" ===Text formatting=== 
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
set scrolloff=10                " let 10 lines before cursor during scroll
set exrc                        " enable usage of additional vimrc files
set secure                      " .vimrc files cannot execute/create files
" set cursorline                  " shows line under the cursor

""" ===gvim options===
if has('win32')  " if running windows will work, else will not work
    set guioptions-=m   " remove menubar set 
    guioptions-=T       " remove toolbar
    set guioptions-=r   " remove right scrollbar
endif

""" ===Plugin Settings & Reference===

" -C-Sharp Asynchronous Server interactions-
let g:OmniSharp_server_stdio = 1

" -Vim-Argwrap-
nnoremap <silent> <leader>a :ArgWrap<CR>  

"" -Syntastic-
noremap <silent><Leader>le :Errors<CR>  
noremap <silent><Leader>lc :lclose<CR>  

"" -Rope-Vim-
map <leader>j :RopeGotoDefinition<CR>
map <leader>r :RopeRename<CR>

"" -Undotree-
nnoremap <F5> :UndotreeToggle<CR>

"" -TagBar settings-
let g:tagbar_autofocus=0
let g:tagbar_width=42
autocmd BufEnter *.py :call tagbar#autoopen(0)
autocmd BufWinLeave *.py :TagbarClose

"" -NERDTree settings-
let NERDTreeIgnore=['\.pyc$', '\.pyo$', '__pycache__$']  " ignore files 
let NERDTreeWinSize=40   " size of NERDTree window
autocmd VimEnter * if !argc() | NERDTree | endif  " Load NERDTree only if vim is run without arguments
nmap " :NERDTreeToggle<CR>

"" SnipMate settings
let g:snippets_dir='~/.vim/vim-snippets/snippets'

"" Riv.vim settings
let g:riv_disable_folding=1

"" -Python Plugin settings-
" python executables for different plugins
let g:pymode_python='python3'
let g:syntastic_python_python_exec='python3'

" rope
let g:pymode_rope=0
let g:pymode_rope_completion=0
let g:pymode_rope_complete_on_dot=0
let g:pymode_rope_auto_project=0
let g:pymode_rope_enable_autoimport=0
let g:pymode_rope_autoimport_generate=0
let g:pymode_rope_guess_project=0

" documentation
let g:pymode_doc=1
let g:pymode_doc_bind='K'

" lints
let g:pymode_lint=0

" virtualenv
let g:pymode_virtualenv=1

" breakpoints
let g:pymode_breakpoint=1
let g:pymode_breakpoint_key='<leader>b'

" syntax highlight
let g:pymode_syntax=1
let g:pymode_syntax_slow_sync=1
let g:pymode_syntax_all=1
let g:pymode_syntax_print_as_function=g:pymode_syntax_all
let g:pymode_syntax_highlight_async_await=g:pymode_syntax_all
let g:pymode_syntax_highlight_equal_operator=g:pymode_syntax_all
let g:pymode_syntax_highlight_stars_operator=g:pymode_syntax_all
let g:pymode_syntax_highlight_self=g:pymode_syntax_all
let g:pymode_syntax_indent_errors=g:pymode_syntax_all
let g:pymode_syntax_string_formatting=g:pymode_syntax_all
let g:pymode_syntax_space_errors=g:pymode_syntax_all
let g:pymode_syntax_string_format=g:pymode_syntax_all
let g:pymode_syntax_string_templates=g:pymode_syntax_all
let g:pymode_syntax_doctests=g:pymode_syntax_all
let g:pymode_syntax_builtin_objs=g:pymode_syntax_all
let g:pymode_syntax_builtin_types=g:pymode_syntax_all
let g:pymode_syntax_highlight_exceptions=g:pymode_syntax_all
let g:pymode_syntax_docstrings=g:pymode_syntax_all

" highlight 'long' lines (>= 80 symbols) in python files
augroup vimrc_autocmds
    autocmd!
    autocmd FileType python,rst,c,cpp highlight Excess ctermbg=DarkGrey guibg=White
    autocmd FileType python,rst,c,cpp match Excess /\%81v.*/
    " autocmd FileType python,rst,c,cpp set nowrap
    autocmd FileType python,rst,c,cpp set colorcolumn=80
augroup END

" code folding
let g:pymode_folding=0

" pep8 indents
let g:pymode_indent=1

" code running
let g:pymode_run=1
let g:pymode_run_bind='<F5>'

" syntastic
let g:syntastic_always_populate_loc_list=1
let g:syntastic_auto_loc_list=1
let g:syntastic_enable_signs=1
let g:syntastic_check_on_wq=0
let g:syntastic_aggregate_errors=1
let g:syntastic_loc_list_height=5
let g:syntastic_error_symbol='X'
let g:syntastic_style_error_symbol='X'
let g:syntastic_warning_symbol='x'
let g:syntastic_style_warning_symbol='x'
let g:syntastic_python_checkers=['flake8', 'pydocstyle', 'python3']

" YouCompleteMe
" set completeopt-=preview

" let g:ycm_global_ycm_extra_conf='~/.vim/ycm_extra_conf.py'
" let g:ycm_confirm_extra_conf=0

" nmap <leader>g :YcmCompleter GoTo<CR>
" nmap <leader>d :YcmCompleter GoToDefinition<CR>
