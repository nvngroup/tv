# Reprodução e miniPlayer

O player principal de Ao Vivo e On Demand permanece montado ao navegar pelo site.
`PlayerPersistente` usa um destino de portal estável e move seu contêiner entre
a tela completa e o miniPlayer. O segundo player da multi tela continua local à
tela Ao Vivo. No modo compacto, os controles nativos permitem pausar, retomar,
ajustar o volume e buscar uma posição nos vídeos sob demanda.

- **Minimizar:** abre o Início e mantém a reprodução no canto da tela.
- **Expandir:** abre o canal ou o filme/episódio em tela completa dentro do site.
- **Fechar:** encerra a reprodução e mantém o ponto salvo para a próxima visita.
- **Recarregar:** oferece “Continuar assistindo”; não inicia mídia automaticamente.
- **Rádio:** iniciar uma rádio encerra o vídeo; iniciar um vídeo para a rádio.

`nvnplus-reproducao` no localStorage guarda o conteúdo, tempo, duração e contexto
da série. O registro é atualizado a cada cinco segundos de reprodução e também
ao pausar, buscar, navegar, fechar e sair da página. As chaves existentes
`tv-last-channel` e `movie-progress-*` continuam sendo atualizadas. Filmes
concluídos não são oferecidos novamente como retomada.

Ao Vivo retoma a transmissão atual: não há promessa de voltar ao instante de uma
transmissão passada. Filmes e episódios usam o ponto salvo após carregar os
metadados. Fontes expiradas, suporte do navegador e autorização do conteúdo
continuam seguindo os players existentes. O desbloqueio de conteúdo restrito
também se aplica à retomada.

Validação: `node --test tests/reproducao.test.mjs`, TypeScript e build Vite.
O fluxo foi conferido no Chrome com MP4 e HLS de teste, incluindo identidade do
elemento de vídeo ao navegar, pausa, recarga, troca de episódio, rádio e celular.
