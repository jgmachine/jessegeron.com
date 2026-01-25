//
//  Gamestats page module
//

define("ebg/site/gamestats", [
    "dojo","dojo/_base/declare",
    "ebg/core/mainsitemodule",
    "dijit/form/DateTextBox",
    "ebg/comboajax"
],
function (dojo, declare) {
    return declare("ebg.site.gamestats", ebg.core.mainsitemodule, {
        constructor: function(){
           this.selectPlayer = null;
           this.selectOpponent = null;

           this.jstpl_gameresult = '<tr>'+
                '<td style="text-align:left;">'+
                    '<div class="emblemwrap_l" ><img src="${game_icon_url}" class="game_icon"></img></div>'+
                    '<a href="/table?table=${table_id}" class="table_name gamename">${game_name}</a><br/>'+
                    '<a href="/table?table=${table_id}" class="table_name bga-link smalltext">#${table_id}</a>'+
                '</td>'+
                '<td><div class="smalltext">${end}</div><div class="smalltext">${duration} mn</div></td>'+
                '<td>${results}</td>'+
                '<td>'+
                    '<div style="display:${arena_visibility}"><span class="smalltext">${arena_win_display}</span> &rarr; ${arena_after_display}</div>'+
                    '<div style="display:${elo_visibility}">'+
                        '<span style="display:${leavepenalty_visibility};" class="leavepenalty">&nbsp;<span><div class="icon20 icon20_penaltyleave "></div> </span></span>'+
                        '<span class="smalltext">${elo_win} ${elo_penalty}</span> &rarr; ${elo_after}'+
                    '</div>'+
                   '<div class="smalltext"><span class="smalltext">${additional_infos}</span></div>'+
                '</td>'+
                '</tr>';
           
           this.jstpl_game = '<div class="stats_by_game" style="display:${visibility}">'+
                    '<a href="/gamepanel?game=${game_name}" class="gamename">${game_name_disp}</a>: '+
                    '${cnt} '+ _('games') +' <a href="#" id="gamefilter_${game_id}" class="gamefilter bga-link">['+_('Filter')+']</a>'+
                '</div>';

           this.jstpl_opp = '<div class="stats_by_opp" style="display:${visibility}">'+
                    '<a href="/player?id=${id}" class="playername">${name}</a>: '+
                    '${results} (${percent}%)'+
                    ' <a href="#" id="playerfilter_${id}" class="playerfilter bga-link">['+_('Filter')+']</a>'+
                '</div>';          
                 
           this.page_displayed = 1;
        },
        
        onLoad: function( args )
        {
            console.log( 'ebg.site.gamestats onLoad' );
            console.log( args );
   
            mainsite.setPageTitle( $('page_title_raw').innerHTML  );
            this.selectPlayer = new ebg.comboajax();
            this.selectPlayer.create( 'main_player', "/player/player/findPlayer.html", 'Find player...' );

            this.selectOpponent = new ebg.comboajax();
            this.selectOpponent.create( 'opponent_player', "/player/player/findPlayer.html", 'Find player...' );
                       
            dojo.connect( this.selectOpponent, 'onChange', this, 'onReloadForm' );
            dojo.connect( this.selectPlayer, 'onChange', this, 'onReloadForm' );
                        
            dojo.parser.parse();
            
            dojo.connect( $('see_more_tables'), 'onclick', this, 'onSeeMoreTables' );

            dojo.connect( $('change_player'), 'onclick', this, function( evt ) {
                dojo.stopEvent( evt );
                dojo.style( "change_player_wrap", 'display', 'inline' );
                dojo.style( "change_player", 'display', 'none' );
                //dojo.style( "change_player_current", 'display', 'none' );
            } );


            dojo.connect( $('change_opponent'), 'onclick', this, function( evt ) {
                dojo.stopEvent( evt );
                dojo.style( "change_opponent_wrap", 'display', 'inline' );
                dojo.style( "change_opponent", 'display', 'none' );
                dojo.style( "change_opponent_current", 'display', 'none' );
            } );
            
            dojo.connect( dijit.byId( 'game' ), 'onChange', this,  'onReloadForm' );

            dojo.connect( $('finished_only'), 'onchange', this, 'onReloadForm' );
            
            dojo.connect( $('anyone'), 'onclick', this, 'onAnyone' );
            
            dojo.connect( dijit.byId( 'date1' ), 'onChange', this,  'onReloadForm' );
            dojo.connect( dijit.byId( 'date2' ), 'onChange', this,  'onReloadForm' );
            
            // Dates
            if( $('date_1_value').innerHTML != '' ) 
            {
                var date1 = new Date(1000*toint( $('date_1_value').innerHTML ) );
                dijit.byId( 'date1' ).set( 'value', date1 );
            }
            if( $('date_2_value').innerHTML != '' ) 
            {
                var date2 = new Date(1000*toint( $('date_2_value').innerHTML ) );
                dijit.byId( 'date2' ).set( 'value', date2 );
            }
               
            dojo.connect( $('see_more_games'), 'onclick', this, function( evt ) {
                dojo.stopEvent( evt );
                dojo.query( '.stats_by_game' ).style( 'display', 'block' );
                dojo.style( 'see_more_games', 'display', 'none' );
            } );               
            dojo.connect( $('see_more_opponents'), 'onclick', this, function( evt ) {
                dojo.stopEvent( evt );
                dojo.query( '.stats_by_opp' ).style( 'display', 'block' );
                dojo.style( 'see_more_opponents', 'display', 'none' );
            } );               
                        
            this.updateResults();
        },
        
        onAnyone: function( evt )
        {
            dojo.stopEvent( evt );
            $('opponent_player_default').innerHTML = '0';
            this.onReloadForm();
        },
        
        onReloadForm: function()
        {
            // Reload form (another URL) to reflect the current change
            var args = this.getFormContent();

            // Do not reload if args have not changed (otherwise there can be a loop on dates)
            if (this.compareArgs(this.latest_args, args))
                return;
            
            this.latest_args = args;

            this.reloadFormFromArgs();
        },
        
        reloadFormFromArgs: function()
        {
            var url = 'gamestats?';
            
            var query = dojo.objectToQuery( this.latest_args );

            gotourl( url+query );
        
        },
        onOnUnload: function()
        {
            console.log( 'ebg.site.gamestats onUnload' );
            dijit.byId( 'main_player' ).destroy();
            dijit.byId( 'opponent_player' ).destroy();
            dijit.byId( 'game' ).destroy();
            dijit.byId( 'date1' ).destroy();
            dijit.byId( 'date2' ).destroy();
        },

        compareArgs: function( args1, args2 ) {
            if (args1.player !== args2.player)
                return false;

            if (args1.opponent_id !== args2.opponent_id)
                return false;

            if (args1.game_id !== args2.game_id)
                return false;

            if (args1.start_date !== args2.start_date)
                return false;

            if (args1.end_date !== args2.end_date)
                return false;

            if (args1.finished !== args2.finished)
                return false;
                
            return true;
        },
        
        getFormContent: function()
        {
            var args = {};
            
            args.player = this.selectPlayer.getSelection();
            if( args.player == null || args.player==0 )
            {   args.player = $('main_player_default').innerHTML }

            args.opponent_id = this.selectOpponent.getSelection();
            if( args.opponent_id == null || args.opponent_id==0 )
            {   args.opponent_id = $('opponent_player_default').innerHTML }

            if( dijit.byId( 'game' ).get('value' ) )
            {   args.game_id = dijit.byId( 'game' ).get('value' );  }

            if( dijit.byId("date1").get("value") )
            {
                var date = new Date( dijit.byId("date1").get("value") );
                args.start_date =  toint( date.getTime()/1000 );  
            }
            
            if( dijit.byId("date2").get("value") )
            {
                date = new Date( dijit.byId("date2").get("value") );
                args.end_date =  toint( date.getTime()/1000 );  
            }
            
            
            if( $('finished_only').checked )
                args.finished = 1;
            else
                args.finished = 0;

            return args;        
        },
        
        addGameResultRows: function( rows )
        {
            for( var i in rows )
            {
                var gameresult = rows[i];
                //console.log("gameresult", gameresult );
                gameresult.results='';
                gameresult.additional_infos = '';
                var player_ids = gameresult.players.split( ',' );
                var player_names = gameresult.player_names.split( ',');
                if( gameresult.ranks )
                {   var player_ranks = gameresult.ranks.split( ',' );   }
                else
                {   var player_ranks = '';  }

                if( gameresult.scores )
                {   var player_score = gameresult.scores.split( ',' );  }
                else
                {   var player_score = '';    }

                for( var i in player_ids )
                {
                    var score = player_score[i];
                    if( typeof player_score[i] == 'undefined' ||  player_score[i] == 'undefined')
                    {
                        score = '-';
                    }

                    if( player_ranks != '' )
                    {
                        gameresult.results+= '<div class="simple-score-entry">'+
                            '<div class="rank">'+this.getRankString(player_ranks[i])+'</div>'+
                            '<div class="name">'+'<a href="/player?id='+player_ids[i]+'" class="playername">'+player_names[i]+'</a>'+'</div>'+
                            '<div class="score">'+
                                score+'  <div class="icon16 icon16_point"></div>'+
                            '</div>'+
                         '</div>';
                    }
                    else
                    {
                        gameresult.results+= '<div class="simple-score-entry">'+
                            '<div class="rank">-</div>'+
                            '<div class="name">'+'<a href="/player?id='+player_ids[i]+'" class="playername">'+player_names[i]+'</a>'+'</div>'+
                            '<div class="score">'+
                                score+'  <div class="icon16 icon16_point"></div>'+
                            '</div>'+
                         '</div>';

                    }
                }

                gameresult.game_name_untranslated = gameresult.game_name;
                gameresult.game_name = this.getGameNameDisplayed( gameresult.game_name );

                gameresult.duration = '-';

                if( gameresult.end )
                {
                    gameresult.duration = Math.round( (toint( gameresult.end )-toint( gameresult.start )) / 60 );
                }

                if( gameresult.normalend == 1 )
                {
                    if( gameresult.unranked == 1 )
                    {
                        gameresult.elo_visibility = 'none';
                        gameresult.additional_infos += _("Unranked game (Training mode)");
                    }
                    else if (gameresult.ranking_disabled == '1') {
                        gameresult.elo_visibility = 'none';
                        gameresult.additional_infos += '('+_("Ranking disabled")+')';
                    }
                    else {
                        gameresult.elo_visibility = 'block';
                    }
                    
                    if( gameresult.concede == 1 )
                    {
                        gameresult.additional_infos += ' ('+_("LB_GAME_CONCEDED")+') ';
                    }
                    
                    gameresult.elo_after = this.getEloLabel( gameresult.elo_after, false, false, gameresult.ranking_disabled == '1' );
                }
                else
                {
                    if( gameresult.unranked == 1 )
                    {
                        gameresult.elo_visibility = 'none';
                        gameresult.elo_after = '';
                        gameresult.additional_infos += _("Unranked game (Training mode)");
                    }
                    else if( typeof gameresult.elo_after != 'undefined' && gameresult.elo_after != null )
                    {
                        if (gameresult.ranking_disabled == '1') {
                            gameresult.elo_visibility = 'none';
                            gameresult.additional_infos += '('+_("Ranking disabled")+') ';
                        }
                        else {
                            gameresult.elo_after = this.getEloLabel( gameresult.elo_after );
                            gameresult.elo_visibility = 'block';
                        }
                        gameresult.additional_infos += '('+_("LB_GAME_ABANDONNED")+')';
                    }
                    else
                    {
                        gameresult.elo_visibility = 'none';
                        gameresult.elo_after = '';
                        gameresult.additional_infos += '('+_("LB_GAME_ABANDONNED")+')';
                    }
                }

                gameresult.leavepenalty_visibility = 'none';
                if (gameresult.elo_penalty !== '') {
                    gameresult.leavepenalty_visibility = 'inline';
                    gameresult.elo_penalty = '-' + gameresult.elo_penalty;
                }

                gameresult.arena_visibility = 'none';
                gameresult.arena_win_display = '';
                gameresult.arena_after_display = '';                
                if( gameresult.arena_win !== null )
                {
                    // Arena mode
                    gameresult.arena_visibility = 'block';

                    var arena_points_details = this.arenaPointsDetails( gameresult.arena_after );

                    if( arena_points_details.league == 5 )
                    {
                        // Elite specific display
                        var sign = gameresult.arena_win >= 0 ? '+':'';
                        gameresult.arena_win_display = sign+Math.round( gameresult.arena_win%1 * 10000 );
                        gameresult.arena_after_display = Math.round( gameresult.arena_after%1 * 10000 )+ ' '+_("pts")+' ';

                        gameresult.arena_after_display += '<div style="display:inline-block;position:relative;margin-top: -20px;margin-bottom: 26px;">';
                        gameresult.arena_after_display += '<div class="myarena_league league_'+arena_points_details.league+'" style="position:relative;display:inline-block;top:21px;left:0px">';
                        gameresult.arena_after_display += '<div class="arena_label"></div>';
                        gameresult.arena_after_display += '</div>';
                        gameresult.arena_after_display += '</div>';  

                    }
                    else
                    {
                        if( gameresult.arena_win > 100 )    
                        {
                            // League promotion
                            gameresult.arena_win_display = '';
                        }
                        else
                        {
                            // Arena point gain
                            var sign = gameresult.arena_win >= 0 ? '+':'';
                            gameresult.arena_win_display = sign+( Math.round( gameresult.arena_win )%10 ) + '<div class="icon20 icon_arena"></div>';
                        }
                        gameresult.arena_after_display = '<div style="display:inline-block;position:relative;margin-top: -20px;margin-bottom: 26px;">';
                        gameresult.arena_after_display += '<div class="myarena_league league_'+arena_points_details.league+'" style="position:relative;display:inline-block;top:21px;">';
                        gameresult.arena_after_display += '<div class="arena_label">'+arena_points_details.points+'</div>';
                        gameresult.arena_after_display += '</div>';
                        gameresult.arena_after_display += '</div>';    
                    }
                }
                
                gameresult.end = date_format( gameresult.end);
                console.log( gameresult );

                if( gameresult.elo_win === null )
                {
                    gameresult.elo_win = '';
                }

                if( mainsite.gamefilter[ gameresult.game_id ] )
                {
                    gameresult.game_version = mainsite.gamefilter[ gameresult.game_id ];
                    gameresult.game_icon_url = getMediaUrl(gameresult.game_name_untranslated, 'icon', null, 'default', Date.now());
                    dojo.place( this.format_string( this.jstpl_gameresult, 
                        gameresult
                        ), 'gamelist_inner' );
                }
/*

                '<td><a href="/table?table=${table_id}"><span class="gamename">${game_name}</span><br/><span class="smalltext">#${table_id}</span></a></td>'+
                '<td><div class="smalltext">${end}</div><div class="smalltext">${duration} mn</div></td>'+
                '<td>${results}</td>'+
                '<td>'+
                   '<div><span class="smalltext">${elo_win}</span> &rarr; ${elo_after}</div>'+
                   '<div class="smalltext"><span class="smalltext">${additional_infos}</span></div>'+
                '</td>'+
                '</tr>';

*/
            }
            
            this.addTooltipToClass( 'masqued_rank', _('Only Premium members can see statistics'), _('Click to see why you should get a Premium membership') );          
                    
        },
        
        updateResults: function()
        {
            // Request gamelist...
            
            // Gather all needed infos
            var args = this.getFormContent();

            this.latest_args = args;
            
            if( args !== null )
            {            
                dojo.empty( 'gamelist_inner' );
            
                dojo.style( 'tablestats_loading', 'display', 'block' );
                args.updateStats=1;
                this.ajaxcall( "/gamestats/gamestats/getGames.html", args, this,
                function( result )
                {
                    dojo.style( 'tablestats_loading', 'display', 'none' );
                    this.addGameResultRows( result.tables );
                    this.updateStats( result.stats );
                    this.page_displayed = 1;
                } );
            }
        },
        
        onSeeMoreTables: function( evt )
        {            
            dojo.stopEvent( evt );
        
            // Gather all needed infos
            var args = this.getFormContent();
            this.page_displayed++;
            args.page = this.page_displayed;
            args.updateStats=0;
            
            this.ajaxcall( "/gamestats/gamestats/getGames.html", args, this,
            function( result )
            {
                if( result.tables.length == 0 )
                {
                    this.showMessage( _("No more results"), 'info' );
                }
                this.addGameResultRows( result.tables );
            } );        
        },
        
        updateStats: function( stats )
        {
            dojo.style( 'stats_wrap', 'display', 'block' );

            // General stats
            $('stats_played').innerHTML = stats.general.played;
            $('stats_victory').innerHTML = stats.general.victory;

            if( stats.general.score == '-' )
            {
                $('stats_score').innerHTML = '-';
            }
            else
            {
                $('stats_score').innerHTML = Math.round( 10*stats.general.score ) / 10;
            }

            if( stats.general.elo_win == '-' )
            {
                $('stats_elowin').innerHTML = '-';
            }
            else
            {
                $('stats_elowin').innerHTML = Math.round( stats.general.elo_win );
            }

            // Stats by game
            dojo.empty( 'stats_by_games' );
            dojo.style( 'see_more_games', 'display', 'none' );
            var item_count = 0;
            var last_game_id = 0;
           
            for( var i in stats.games )
            {
                item_count++;
                var game = stats.games[i];
                last_game_id = game.game_id;
                
                game.game_name_disp = this.getGameNameDisplayed( game.game_name );
                
                game.visibility = 'block';
                if( item_count > 3 )
                {
                    game.visibility = 'none';
                    dojo.style( 'see_more_games', 'display', 'block' );
                }
                
                dojo.place( this.format_string( this.jstpl_game, game ), 'stats_by_games' );

                dojo.connect( $('gamefilter_'+game.game_id), 'onclick', this, dojo.hitch( this, function(evt) {
                    dojo.stopEvent( evt );
                    
                    var game_id = evt.currentTarget.id.substr( 11 );
                    
                    this.latest_args.game_id = game_id;
                    this.reloadFormFromArgs();
                
                } ) );

            }
            if( item_count == 1 )
            {
                dojo.style( 'game_statistics', 'display', 'block' );
                let playerId = $('game_statistics').getAttribute('data-player-id');
                $('game_statistics').href = 'playerstat?id=' + playerId + '&game=' + last_game_id;
            }
            else
            {
                dojo.style( 'game_statistics', 'display', 'none' );
            }
            
            // Stats by opponent
            dojo.empty( 'stats_by_opponents' );
            dojo.style( 'see_more_opponents', 'display', 'none' );
            var item_count = 0;
           
            for( var i in stats.opponents )
            {
                item_count++;
                var opp = stats.opponents[i];
                
                opp.visibility = 'block';
                if( item_count > 3 )
                {
                    opp.visibility = 'none';
                    dojo.style( 'see_more_opponents', 'display', 'block' );
                }
                opp.results = dojo.string.substitute( _('${hits} hits on ${nbr} games'), opp );
                opp.percent = Math.round( 100 * opp.hits / opp.nbr );
                
                dojo.place( this.format_string( this.jstpl_opp, opp ), 'stats_by_opponents' );
                
                dojo.connect( $('playerfilter_'+opp.id), 'onclick', this, dojo.hitch( this, function(evt) {
                    dojo.stopEvent( evt );
                    
                    var opp_id = evt.currentTarget.id.substr( 13 );
                    
                    this.latest_args.opponent_id = opp_id;
                    this.reloadFormFromArgs();
                
                } ) );
            }

        }
  });             
});




