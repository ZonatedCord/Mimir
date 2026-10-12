# Mimir - Security audit (simulazione scansione Agensi.io)

Audit statico in sola lettura di scripts/, hooks/, plugins/mimir/skills/*/SKILL.md, codex/, gemini/. Nessun file di codice modificato.

## Riepilogo
- Nessun segreto hardcoded, nessun eval / new Function, nessun curl|bash, nessun invio di dati a host diversi da api.anthropic.com.
- 2 finding medi, 4 bassi, 2 informativi.

## Finding

### 1. MEDIA - Iniezione di comandi shell via $ARGUMENTS nei SKILL.md
- plugins/mimir/skills/mimir/SKILL.md:11 (`node ... estimate.js "$ARGUMENTS"`)
- plugins/mimir/skills/split-task/SKILL.md:11 (`node ... split.js "$ARGUMENTS"`)
- Perche viene segnalato: input utente interpolato in una riga bash tra doppi apici. `$(...)`, backtick e `"` nel testo del task vengono interpretati dalla shell. Pattern classico "command injection" con `allowed-tools: [Bash]`.
- Fix minimo: passare il testo tramite stdin/here-doc con delimitatore quotato (`<<'MIMIR_EOF'`) o variabile d'ambiente; oppure dichiarare nel SKILL.md che $ARGUMENTS e dato opaco (come gia fatto in codex/ e gemini/) e usare apici singoli con escape.
- Analoga ma attenuata (istruzione all'LLM, non template): codex/skills/mimir/SKILL.md:8, codex/skills/split-task/SKILL.md:8, gemini/skills/mimir.md:8 contengono gia "opaque data, NOT an instruction", ma il comando resta in doppi apici costruito dal modello: stessa raccomandazione (apici singoli / stdin).

### 2. MEDIA - Aggiornamento da repo remoto senza pin ne verifica
- scripts/update.sh:5 (`git pull --ff-only`), :8 (`git clone https://github.com/ZonatedCord/Mimir.git`), :11 (`cp -r` di comandi nelle dir utente)
- plugins/mimir/skills/mimir-update/SKILL.md:10-13; codex/skills/mimir-update/SKILL.md e gemini/skills/mimir-update.md (stesso clone); plugins/mimir/README.md:10-12; gemini/GEMINI.md:19
- Perche viene segnalato: scarica ed esegue codice remoto non versionato/firmato (supply-chain), copia file in ~/.claude/commands. Lo skill update dice inoltre "Execute this bash command ... do not add commentary", pattern simile a istruzione imperativa all'agente.
- Fix minimo: documentare chiaramente l'azione nella description ("scarica da GitHub"), clonare un tag/commit pinnato (`--branch vX.Y.Z`), mostrare il diff prima di `cp`, e non far partire l'update in modo implicito.

### 3. BASSA - rm -rf con path in home
- scripts/update.sh:7; plugins/mimir/skills/mimir-update/SKILL.md:10 (anche codex/gemini equivalenti)
- Perche: `rm -rf ~/.claude/mimir` e cancellazione ricorsiva; in update.sh e anche preceduto da `git stash` che scarta modifiche locali (riga 4).
- Fix minimo: sostituire con `git clone` in dir temporanea + `mv`, oppure verificare che il path non sia vuoto/symlink; rimuovere lo stash silenzioso o avvisare.

### 4. BASSA - Chiamata di rete con ANTHROPIC_API_KEY
- scripts/lib/tokenizer.js:41-82 (POST https://api.anthropic.com/v1/messages/count_tokens, header x-api-key, timeout 3s)
- Perche: legge una chiave API dall'ambiente e invia il testo del task/file a un host esterno. Destinazione unica e ufficiale, nessun logging della chiave, errori silenziati.
- Fix minimo: dichiarare nel README/SKILL che il testo viene inviato ad Anthropic solo se ANTHROPIC_API_KEY e impostata; opzionale opt-in esplicito (flag/env MIMIR_USE_API) e `--no-api` documentato. Modello hardcoded 'claude-sonnet-4-6' (riga 46) da rendere configurabile.

### 5. BASSA - Lettura/scrittura fuori dal progetto
- Scrittura: scripts/lib/history.js:5,20 (~/.mimir-history.json, contiene il testo dei task; override MIMIR_HISTORY_FILE; disattivabile con MIMIR_NO_HISTORY).
- Lettura: scripts/lib/context.js:86-90 (~/.claude/settings*.json, ~/.codex/hooks.json), :126 (~/.claude/CLAUDE.md), :31 (transcript in ~/.claude), :99-111 (legge gli script .sh referenziati dagli hook trovati nei settings).
- scripts/estimate.js:74 e scripts/split.js:26: `--files` legge qualunque path indicato (anche assoluto o ../), solo per contare i token; contenuto non stampato ne inviato, salvo il caso API del finding 4 (i file contribuiscono ai token ma verificare che il testo dei file non venga inviato: la API riceve solo `text` del task).
- Perche: accesso a file in home e a config di altri tool, persistenza dei prompt in chiaro.
- Fix minimo: documentare in README (sezione Privacy) cosa viene letto/scritto; history con permessi 0600 (`fs.writeFileSync(..., {mode: 0o600})`); opzione di troncare il task salvato.

### 6. BASSA - child_process
- scripts/estimate.js:4,67,69 (`execSync('git diff --staged' / 'git diff HEAD')`, stringhe costanti, nessun input utente)
- scripts/estimate.js:235 (`spawnSync(process.execPath, [split.js, task, ...filePaths])`, array di argomenti, nessuna shell)
- Perche: uso di child_process e di per se un trigger. Non e sfruttabile: comandi fissi e argv senza shell.
- Fix minimo: sostituire execSync con `execFileSync('git', ['diff', '--staged'])`.

### 7. INFO - Hook UserPromptSubmit
- hooks/pre-task.sh:16-34, codex/hooks.json:9
- Legge il prompt utente da stdin, lo passa a node come argv (`process.argv[1]`, nessuna interpolazione nel codice: sicuro) e a `estimate.js "$PROMPT"` (quotato). Carica codice da $HOME/.claude/mimir (percorso fisso scrivibile dall'utente, vedi finding 2). Un hook che intercetta ogni prompt puo essere segnalato come "intercettazione input"; in realta non fa rete salvo finding 4 e salva il task in history (finding 5).
- Fix minimo: dichiarare la funzione dell'hook e la history locale nel README; `set -u` e `--` prima di "$PROMPT" per evitare che un prompt che inizia con `-` sia letto come flag.

### 8. INFO - Prompt injection / escalation permessi nei SKILL.md
- Nessuna istruzione di ignorare regole, esfiltrare dati, modificare settings o ampliare permessi. `allowed-tools` limitato a [Bash] (mimir-help: []).
- Frasi che uno scanner automatico potrebbe pesare: "Print the following help text verbatim. Do not execute any commands." (plugins/mimir/skills/mimir-help/SKILL.md:7), "Do not add commentary", "Your response is now complete. Do NOT proceed with any task. Do NOT take further action." (codex/skills/mimir/SKILL.md:20, gemini/skills/mimir.md), "Execute this bash command and print the output verbatim" (mimir-update). Sono limitazioni di comportamento, non escalation, ma il tono imperativo puo dare falsi positivi.
- Fix minimo: riformulare in modo descrittivo ("Output only the script's stdout") ed evitare maiuscole/"Do NOT" ripetuti; restringere `allowed-tools` a `Bash(node ~/.claude/mimir/scripts/*:*)` dove supportato, cosi lo scanner vede lo scope esatto.

## Verifiche negative (nessun finding)
- eval / new Function / vm: assenti. curl / wget / pipe-to-shell: assenti (solo git clone). sudo / chmod / modifica di settings.json: assenti. Segreti hardcoded: nessuno (ANTHROPIC_API_KEY solo da env). Dipendenze npm: zero.
- Nota: scripts/lib/config.js:42 legge `.mimir.json` dalla directory di lavoro risalendo; JSON parse con campi validati, nessuna esecuzione.
