require('./common');
var odgn = require('../index')();
var EntitySystem = odgn.entity.EntitySystem;

describe('EntitySystem', function(){
    beforeEach( function(done){
        var self = this;
        // passing a callback to create will initialise
        this.registry = odgn.entity.Registry.create({initialise:true}, function(err,registry){
            self.registry = registry;
            done();
        });
    });

    describe('Registration', function(){



        it('should add a system to the registry', function(done){
            var SystemModel = EntitySystem.Model.extend({});
            this.registry.listenTo( this.registry, 'system:add', function(system,registry){
                done();
            });
            this.registry.addSystem( SystemModel );
        });

        it('should add a system to the registry which is then updated', function(done){
            var SystemModel = EntitySystem.Model.extend({
                update: function(){
                    done();
                },
            });
            this.registry.addSystem( {Model:SystemModel,id:'/system/test'} );
            this.registry.update();
        });



        it('should execute systems in order', function(done){
            var isExecuted = false;
            var SysA = EntitySystem.Model.extend({
                update: function( deltaTime, startTime, currentTime, options, callback ){
                    assert( isExecuted );
                    done();
                }
            });
            var SysB = EntitySystem.Model.extend({
                update: function( deltaTime, startTime, currentTime, options, callback ){
                    isExecuted = true;
                }
            });
            this.registry.addSystem( {Model:SysA,id:'/system/test/a'} );
            this.registry.addSystem( {Model:SysB,id:'/system/test/b'}, {priority:1} );

            this.registry.update();
        });


        it('should not update non-updateable systems', function(done){
            var isExecuted = false;
            var SysB = EntitySystem.Model.extend({
                update: function( deltaTime, startTime, currentTime, options, callback ){
                    isExecuted = true;
                }
            });

            this.registry.addSystem( {Model:SysB,id:'/system/test/b'}, {update:false} );
            this.registry.listenTo( this.registry, 'system:update:finish', function(system,registry){
                assert(!isExecuted);
                done();
            });
            this.registry.update();
        });

    });
});