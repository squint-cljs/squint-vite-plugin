(ns main
  (:require-macros [foo :as foo])
  (:require ["react" :as React :refer [StrictMode]]
            ["react-dom/client" :as ReactDOM]
            ["@/App.cljs" :refer [App]] ;; alias
            ["@/index.css"] ;; alias
            ["./test.css"] ;; relative path
            ["./data.json$default" :as data] ;; relative path, json import
            ["./Test" :refer [test]] ;; resolve cljs file
            ["./tailwind.css"]
            ))

(test)
(foo/debug :main "Hello from main.cljs")
(js/console.log data)
(def root (ReactDOM/createRoot (js/document.getElementById "root")))
(.render root #jsx [StrictMode [App]])
