# Contador

Abra **index.html** no navegador. Não há instalação, dependências, build, fontes externas ou acesso à rede. Mantenha `index.html`, `style.css`, `logic.js` e `app.js` na mesma pasta.

## Uso

- Selecione 1 a 4 bits e flip-flops D ou JK. Qa é sempre o menos significativo. A tabela e os rótulos binários mostram o mais significativo à esquerda.
- Clique nos bits do próximo estado para alternar 0 → 1 → X → 0. Os botões também respondem a Tab, Enter e Espaço.
- X₀ e X₁ mantêm a especificação indiferente e mostram o resultado efetivo do circuito. A escolha pode mudar ao editar outras células ou trocar o tipo de flip-flop.
- Selecione uma equação para abrir seu mapa de Karnaugh. Selecione um termo para destacar suas células; a ordem Gray preserva a adjacência, inclusive entre bordas opostas.
- No mapa, X é uma indiferença de **excitação**: pode vir do próximo estado livre ou da própria tabela JK. O subescrito indica o valor da entrada, não necessariamente o próximo Q.
- Todos os estados aparecem no diagrama. Selecione um nó para destacar sua seta. A lista textual abaixo também contém todas as transições.
- O exemplo inicial de 3 bits conta 0 → 1 → 2 → 3 → 4 → 5 → 0 e deixa 6 e 7 livres. Para 1 e 2 bits, o exemplo usa todos os estados.
- A troca da quantidade de bits preserva um rascunho por quantidade durante a sessão. Recarregar a página restaura o exemplo; nada é enviado ou salvo remotamente.

## Critério matemático

O algoritmo enumera os cubos válidos de até quatro variáveis, extrai os implicantes primos e resolve a cobertura exata dos mintermos obrigatórios com memoização. Minimiza primeiro o número de termos da soma de produtos e depois o total de literais, **por entrada**, sem otimização de portas compartilhadas. Empates têm escolha determinística; podem existir outras soluções igualmente mínimas. Uma função inteiramente indiferente é escolhida como 0.

Para D, D = Q⁺. Para JK, 0→0 exige J=0; 0→1 exige J=1; 1→0 exige K=1; 1→1 exige K=0; a outra entrada é indiferente. Os próximos estados resolvidos são calculados por Q⁺ = J·¬Q + ¬K·Q, nunca por escolhas independentes na tabela. Não são modelados atrasos, glitches ou restrições elétricas.

## Validação de desenvolvimento

`node tests.cjs` executa verificações matemáticas sem pacotes externos. Node é apenas uma opção para repetir os testes; não é necessário para usar a aplicação.
