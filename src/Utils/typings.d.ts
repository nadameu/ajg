type CSSInstructions = {
	[selector: string]: {
		[property: string]: string;
	};
};

type Fn<A, B> = {
	(a: A): B;
};
