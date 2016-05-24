var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);



angular.module('simpletonApp', ['luegg.directives', 'ngSanitize'])
    .controller('SimpletonChatController', ['$http','$location','$sce', function($http, $location, $sce) {
        var Simpleton = this;
        Simpleton.windowHeight = (w < 992 ? h-82 : h);
        Simpleton.glued = true;
        Simpleton.messageText = "";
        Simpleton.users = [
            { name: "Simpleton", float: "left", avatar: "W" },
            { name: "You", float: "right", avatar: "Y" }
        ];
        Simpleton.messages = [
            { from: Simpleton.users[0], text: "Hi, How may I help you today?" }
        ];

        Simpleton.askQuestion = function() {
            var params = { input : Simpleton.messageText };
            if (Simpleton.conversation_id) {
                params.conversation_id = Simpleton.conversation_id;
                params.client_id = Simpleton.client_id;
            }
            Simpleton.messages.push({
                from: Simpleton.users[1], text: Simpleton.messageText
            });
            $http({
                method: 'POST',
                data: { input: Simpleton.messageText },
                url: '/conversation'
            }).then(function successCallback(response) {
                var dialogResp = response;
                Simpleton.conversation_id = response.data.conversation.conversation_id;
                Simpleton.client_id = response.data.conversation.client_id;
                Simpleton.talk(dialogResp);
            }, function errorCallback(response) {
                // called asynchronously if an error occurs
                // or server returns response with an error status.
            });
        };
        Simpleton.talk = function(response) {
            var str = "";
            str += response.data.conversation.response[0];
            for(var i=1; i<response.data.conversation.response.length; i++) {
                if(response.data.conversation.response[i-1] !== "")
                    str += '<br/>';
                str += response.data.conversation.response[i];
            }
            Simpleton.messages.push({from: Simpleton.users[0], text:$sce.trustAsHtml(str)});
            Simpleton.messageCounter++;
            console.log(response);
        };
        $('body').bind('mousewheel', function(e) {
            var $div = $('.messages');

            $div.scrollTop($div.scrollTop()
                - e.originalEvent.wheelDelta);

            return false;
        });
    }]).directive('ngEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if(event.which === 13) {
                scope.$apply(function(){
                    scope.$eval(attrs.ngEnter, {'event': event});
                });

                event.preventDefault();
            }
        });
    };
});