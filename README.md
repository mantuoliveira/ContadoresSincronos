# Contador — Sistemas Digitais I

Abra **index.html** no navegador. Não há instalação, dependências, build, fontes externas ou acesso à rede. Mantenha `index.html`, `style.css`, `logic.js` e `app.js` na mesma pasta.

## Uso

- Selecione 1 a 4 bits e flip-flops D ou JK. Qa é sempre o menos significativo. A tabela e os rótulos binários mostram o mais significativo à esquerda.
- Clique nos bits do próximo estado para alternar 0 → 1 → X → 0. Os botões também respondem a Tab, Enter e Espaço.
- X₀ e X₁ mantêm a especificação indiferente e mostram o resultado efetivo do circuito. A escolha pode mudar ao editar outras células ou trocar o tipo de flip-flop.
- O terceiro bloco da tabela exibe as entradas dos flip-flops, calculadas automaticamente. Para JK de 3 bits: Jc, Kc, Jb, Kb, Ja, Ka; para D: Dc, Db, Da. Cada X mantém a indiferença da tabela de excitação, com o valor efetivo da equação em subescrito. Um próximo estado livre deixa as respectivas entradas livres para a minimização.
- Selecione uma equação para abrir seu mapa de Karnaugh. Clique diretamente em um termo da equação ou no botão correspondente abaixo do mapa para destacar suas células em verde escuro; a ordem Gray preserva a adjacência, inclusive entre bordas opostas.
- No mapa, X é uma indiferença de **excitação**: pode vir do próximo estado livre ou da própria tabela JK. O subescrito indica o valor da entrada, não necessariamente o próximo Q.
- Também é possível clicar diretamente nas células do mapa. Se a célula pertence a vários termos, cliques sucessivos percorrem esses grupos e depois removem o destaque. Uma célula sem grupo exibe essa informação.
- No mapa, Qa fica à esquerda, Qb à direita, Qc acima e Qd abaixo. Cada borda mostra os valores da variável correspondente. Para menos de quatro bits, aparecem apenas as variáveis existentes.
- Todos os estados aparecem no diagrama. Clique num nó para levar o contador a esse estado e iniciar ou retomar a sequência a partir dele.
- O display de 7 segmentos ao lado do diagrama acompanha o estado atual em hexadecimal: 0–9, A, b, C, d, E e F. Inicia automaticamente com clock de 1 Hz. É possível pausar, avançar um pulso (ficando pausado) e ajustar a velocidade. Clicar num estado sempre retoma a contagem; o primeiro pulso ocorre após um intervalo completo. Editar a tabela atualiza imediatamente a sequência simulada.
- O exemplo inicial de 3 bits conta 0 → 1 → 2 → 3 → 4 → 5 → 0 e deixa 6 e 7 livres. Para 4 bits, o exemplo é um contador de década (módulo 10): 0 → 1 → … → 9 → 0, deixando 10 a 15 livres. Para 1 e 2 bits, o exemplo usa todos os estados.
- A troca da quantidade de bits preserva um rascunho por quantidade durante a sessão. Recarregar a página restaura o exemplo; nada é enviado ou salvo remotamente.

## Critério matemático

O algoritmo enumera os cubos válidos de até quatro variáveis, extrai os implicantes primos e resolve a cobertura exata dos mintermos obrigatórios com memoização. Minimiza primeiro o número de termos da soma de produtos e depois o total de literais, **por entrada**, sem otimização de portas compartilhadas. Empates têm escolha determinística; podem existir outras soluções igualmente mínimas. Uma função inteiramente indiferente é escolhida como 0.

Para D, D = Q⁺. Para JK, 0→0 exige J=0; 0→1 exige J=1; 1→0 exige K=1; 1→1 exige K=0; a outra entrada é indiferente. Os próximos estados resolvidos são calculados por Q⁺ = J·¬Q + ¬K·Q, nunca por escolhas independentes na tabela. Não são modelados atrasos, glitches ou restrições elétricas.

## Validação de desenvolvimento

`node tests.cjs` executa verificações matemáticas sem pacotes externos. Node é apenas uma opção para repetir os testes; não é necessário para usar a aplicação.
