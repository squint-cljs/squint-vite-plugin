(ns foo)


(defmacro debug [_kwd body]
  `(println ::debug ~body))
