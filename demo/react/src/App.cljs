(ns app
  (:require ["react" :refer [useState]]
            ["./assets/react.svg$default" :as react-logo]
            ["/vite.svg$default" :as vite-logo]
            ["./App.css"]))



(defn App []
  (let [[count set-count] (useState 0)]
    #jsx [:<>
          [:div
           [:a {:href "https://vitejs.dev" :target "_blank"}
            [:img {:src vite-logo :className "logo" :alt "Vite logo"}]]
           ;; TODO squint logo
           [:a {:href "https://react.dev" :target "_blank"}
            [:img {:src react-logo :className "logo react" :alt "React logo"}]]]
          [:h1 "Vite + Squint + React"]
          [:div {:className "card"}
           ;; Change className or `count is ` text to test HMR & tailwind HMR
           [:button {:onClick #(set-count (inc count)) :className "text-green-300"}
            "count is " count]
           [:p "Edit " [:code "src/App.cljs"] " and save to test HMR"]]
          [:p {:className "read-the-docs"}
           "Click on the Vite and React logos to learn more"]]))
